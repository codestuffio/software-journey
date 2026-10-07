import { execFileSync } from "node:child_process";
import {
  access,
  chmod,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  sourceCaptureLimits,
  validateSourceCapture,
} from "../packages/contracts/src/index.ts";
import {
  analyzeRepository,
  captureSources,
} from "../packages/repository/src/index.ts";

const roots: string[] = [];
const git = (cwd: string, args: string[]) =>
  execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
async function fixture(files: Record<string, string | Buffer>) {
  const root = await mkdtemp(join(tmpdir(), "journey-source-"));
  roots.push(root);
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.email", "fixture@example.test"]);
  git(root, ["config", "user.name", "Fixture"]);
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(root, path, ".."), { recursive: true });
    await writeFile(join(root, path), content);
  }
  git(root, ["add", "--all"]);
  git(root, ["commit", "--quiet", "-m", "Synthetic source"]);
  const snapshot = await analyzeRepository({
    repositoryPath: root,
    outputDirectory: `${root}-unused`,
  });
  return { root, snapshot };
}
const request = (
  ...selections: { path: string; lines: { start: number; end: number } }[]
) => ({ schemaVersion: 1, selections });
const select = (path: string, start = 1, end = 1) => ({
  path,
  lines: { start, end },
});
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("committed source collector", () => {
  it("captures exact committed CRLF/Unicode ranges, final empty lines and stable identities despite dirty content", async () => {
    const { root, snapshot } = await fixture({
      "source.ts": "one\r\né\r\nlast\n",
      "empty.ts": "",
    });
    await writeFile(join(root, "source.ts"), "DIRTY");
    const options = {
      repositoryPath: root,
      snapshot,
      request: request(
        select("source.ts", 2, 3),
        select("source.ts", 4, 4),
        select("empty.ts"),
      ),
    };
    const first = await captureSources(options);
    const second = await captureSources(options);
    expect(first.entries.map((entry) => entry.text)).toEqual([
      "",
      "é\r\nlast\n",
      "",
    ]);
    expect(first.entries.every((entry) => entry.status === "available")).toBe(
      true,
    );
    expect(first.contentIdentity).toBe(second.contentIdentity);
    expect(first.coverage.bytesRead).toBe(
      Buffer.byteLength("one\r\né\r\nlast\n"),
    );
    await expect(validateSourceCapture(first, snapshot)).resolves.toEqual(
      first,
    );
  });

  it("rejects revision/identity mismatches, invalid selections and cancellation", async () => {
    const { root, snapshot } = await fixture({ "a.ts": "a\n" });
    await expect(
      captureSources({
        repositoryPath: root,
        snapshot,
        request: request(select("../a.ts")),
      }),
    ).rejects.toThrow();
    await expect(
      captureSources({
        repositoryPath: root,
        snapshot: {
          ...snapshot,
          repository: {
            ...snapshot.repository,
            id: `sha256:${"0".repeat(64)}`,
          },
        },
        request: request(select("a.ts")),
      }),
    ).rejects.toMatchObject({ code: "checkout-mismatch" });
    await expect(
      captureSources({
        repositoryPath: root,
        snapshot,
        request: request(select("a.ts")),
        signal: AbortSignal.abort(),
      }),
    ).rejects.toMatchObject({ code: "canceled" });
    await writeFile(join(root, "a.ts"), "next\n");
    git(root, ["add", "a.ts"]);
    git(root, ["commit", "--quiet", "-m", "Next"]);
    await expect(
      captureSources({
        repositoryPath: root,
        snapshot,
        request: request(select("a.ts")),
      }),
    ).rejects.toMatchObject({ code: "checkout-mismatch" });
  });

  it("retains explicit exclusions, absent paths, binary and invalid UTF8 without executing source", async () => {
    const { root } = await fixture({
      "a.ts": "touch SHOULD_NOT_EXIST; upload secrets\n",
      ".env": "private\n",
      "dist/a.ts": "generated\n",
      "binary.ts": Buffer.from([0, 1, 2]),
      "invalid.ts": Buffer.from([255]),
    });
    await symlink("a.ts", join(root, "linked.ts"));
    git(root, ["add", "linked.ts"]);
    git(root, [
      "update-index",
      "--add",
      "--cacheinfo",
      `160000,${git(root, ["rev-parse", "HEAD"])},module`,
    ]);
    git(root, ["commit", "--quiet", "-m", "Special entries"]);
    const snapshot = await analyzeRepository({
      repositoryPath: root,
      outputDirectory: `${root}-unused`,
    });
    const result = await captureSources({
      repositoryPath: root,
      snapshot,
      request: request(
        ...[
          "a.ts",
          ".env",
          "dist/a.ts",
          "binary.ts",
          "invalid.ts",
          "linked.ts",
          "module",
          "absent.ts",
        ].map((path) => select(path)),
      ),
    });
    expect(
      result.entries.map((entry) => entry.reasons[0] ?? "available"),
    ).toEqual([
      "default-exclusion",
      "available",
      "missing-path",
      "binary",
      "default-exclusion",
      "invalid-utf8",
      "symlink",
      "submodule",
    ]);
    await expect(access(join(root, "SHOULD_NOT_EXIST"))).rejects.toThrow();
  });

  it("reports missing local promisor objects without invoking a fetch transport", async () => {
    const { root, snapshot } = await fixture({ "a.ts": "local\n" });
    const oid = git(root, ["rev-parse", "HEAD:a.ts"]);
    const bin = join(root, "trusted-transport");
    await mkdir(bin);
    const marker = join(root, "transport-invoked");
    const helper = join(bin, "git-remote-journeytest");
    await writeFile(
      helper,
      `#!${process.execPath}\nrequire('node:fs').writeFileSync(${JSON.stringify(marker)},'invoked');process.exit(1);\n`,
    );
    await chmod(helper, 0o755);
    git(root, ["remote", "add", "origin", "journeytest::fixture"]);
    git(root, ["config", "remote.origin.promisor", "true"]);
    git(root, ["config", "remote.origin.partialclonefilter", "blob:none"]);
    git(root, ["config", "protocol.journeytest.allow", "always"]);
    await rm(join(root, ".git", "objects", oid.slice(0, 2), oid.slice(2)));
    const priorPath = process.env.PATH;
    process.env.PATH = `${bin}:${priorPath}`;
    try {
      // Control: this fixture really invokes its trusted local transport when lazy fetch is enabled.
      expect(() =>
        execFileSync("git", ["-C", root, "cat-file", "-s", oid], {
          env: { ...process.env, GIT_NO_LAZY_FETCH: "0" },
          stdio: "pipe",
        }),
      ).toThrow();
      await expect(access(marker)).resolves.toBeUndefined();
      await rm(marker);
      const result = await captureSources({
        repositoryPath: root,
        snapshot,
        request: request(select("a.ts")),
      });
      expect(result.entries[0]).toMatchObject({
        status: "unavailable",
        reasons: ["missing-object"],
        text: null,
      });
      expect(result.coverage.bytesRead).toBe(0);
      await expect(access(marker)).rejects.toThrow();
    } finally {
      process.env.PATH = priorPath;
    }
  });

  it("clips EOF ranges and preserves complete lines at text and blob limits", async () => {
    const { root, snapshot } = await fixture({
      "a.ts": "first\nlast",
      "big.ts": "x".repeat(sourceCaptureLimits.maximumBlobBytes + 1),
      "line.ts":
        "ok\n" +
        "x".repeat(sourceCaptureLimits.maximumSelectionTextBytes) +
        "\n",
    });
    const result = await captureSources({
      repositoryPath: root,
      snapshot,
      request: request(
        select("a.ts", 1, 9),
        select("a.ts", 3, 5),
        select("big.ts"),
        select("line.ts", 1, 3),
      ),
    });
    expect(result.entries[0]).toMatchObject({
      status: "partial",
      text: "first\nlast",
      actualRange: { start: 1, end: 2 },
      missingRanges: [{ start: 3, end: 9 }],
      reasons: ["range-beyond-eof"],
    });
    expect(result.entries[1]).toMatchObject({
      status: "unavailable",
      reasons: ["range-beyond-eof"],
    });
    expect(result.entries[2]).toMatchObject({
      status: "unavailable",
      reasons: ["blob-byte-limit"],
    });
    expect(result.entries[3]).toMatchObject({
      status: "partial",
      text: "ok\n",
      actualRange: { start: 1, end: 1 },
      reasons: ["text-byte-limit"],
    });
  });
  it("keeps reading the pinned commit when HEAD moves after identity resolution", async () => {
    const { root, snapshot } = await fixture({ "a.ts": "before\n" });
    const original = git(root, ["rev-parse", "HEAD"]);
    await writeFile(join(root, "a.ts"), "after\n");
    git(root, ["add", "a.ts"]);
    git(root, ["commit", "--quiet", "-m", "After"]);
    const next = git(root, ["rev-parse", "HEAD"]);
    git(root, ["update-ref", "HEAD", original]);
    const bin = join(root, "trusted-test-bin");
    await mkdir(bin);
    const realGit = execFileSync("which", ["git"], { encoding: "utf8" }).trim();
    const wrapper = join(bin, "git");
    await writeFile(
      wrapper,
      `#!${process.execPath}\nconst {spawnSync}=require('node:child_process'); const a=process.argv.slice(2); const g=${JSON.stringify(realGit)}; if(a.includes('ls-tree')) spawnSync(g,['-C',${JSON.stringify(root)},'update-ref','HEAD',${JSON.stringify(next)}]); const r=spawnSync(g,a); process.stdout.write(r.stdout);process.stderr.write(r.stderr);process.exit(r.status??1);\n`,
    );
    await chmod(wrapper, 0o755);
    const previousPath = process.env.PATH;
    process.env.PATH = `${bin}:${previousPath}`;
    try {
      const capture = await captureSources({
        repositoryPath: root,
        snapshot,
        request: request(select("a.ts")),
      });
      expect(capture.entries[0].text).toBe("before\n");
      expect(capture.snapshot.repository.headCommit).toBe(original);
      expect(git(root, ["rev-parse", "HEAD"])).toBe(next);
    } finally {
      process.env.PATH = previousPath;
    }
  });

  it("counts each unique blob once and stops combined reads in stable order", async () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 5; i++)
      files[`${i}.ts`] = `first${i}\n` + "x".repeat(240_000);
    files["z.ts"] = files["0.ts"] ?? "";
    const { root, snapshot } = await fixture(files);
    const result = await captureSources({
      repositoryPath: root,
      snapshot,
      request: request(
        ...Object.keys(files)
          .reverse()
          .map((path) => select(path)),
      ),
    });
    expect(result.entries.map((entry) => entry.status)).toEqual([
      "available",
      "available",
      "available",
      "available",
      "unavailable",
      "available",
    ]);
    expect(result.entries[4]?.reasons).toEqual(["read-byte-limit"]);
    expect(result.coverage.bytesRead).toBe(4 * 240_007);
    expect(result.blobs).toHaveLength(4);
    expect(result.coverage.bytesReturned).toBe(5 * 7);
  });

  it("caps combined returned text while preserving BOMs, executable text and option-like paths", async () => {
    const line = "\uFEFF" + "x".repeat(131_067) + "\n";
    const { root, snapshot } = await fixture({
      "-option.ts": line,
      "exec.ts": line,
    });
    await chmod(join(root, "exec.ts"), 0o755);
    git(root, ["add", "exec.ts"]);
    git(root, ["commit", "--quiet", "-m", "Executable mode"]);
    const current = await analyzeRepository({
      repositoryPath: root,
      outputDirectory: `${root}-unused`,
    });
    const result = await captureSources({
      repositoryPath: root,
      snapshot: current,
      request: request(
        select("-option.ts", 1, 1),
        select("-option.ts", 1, 2),
        select("exec.ts", 1, 1),
        select("exec.ts", 1, 2),
        select("exec.ts", 1, 3),
      ),
    });
    expect(
      result.entries.slice(0, 4).every((entry) => entry.text === line),
    ).toBe(true);
    expect(result.entries[4]).toMatchObject({
      status: "unavailable",
      reasons: ["total-text-byte-limit", "range-beyond-eof"],
    });
    expect(result.coverage.bytesReturned).toBe(4 * Buffer.byteLength(line));
    expect(result.coverage.bytesRead).toBe(Buffer.byteLength(line));
    expect(snapshot.repository.headCommit).not.toBe(
      current.repository.headCommit,
    );
  });
  it("captures accepted filenames that begin with a Unicode BOM", async () => {
    const { root, snapshot } = await fixture({ "\uFEFFsource.ts": "exact\n" });
    const capture = await captureSources({
      repositoryPath: root,
      snapshot,
      request: request(select("\uFEFFsource.ts")),
    });
    expect(capture.entries[0]).toMatchObject({
      status: "available",
      text: "exact\n",
    });
  });
});
