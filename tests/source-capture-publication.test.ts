import { execFileSync } from "node:child_process";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { afterEach, expect, test, vi } from "vitest";
import { validateSourceCapture } from "../packages/contracts/src/index.ts";
import { gitTimeoutMs, runGit } from "../packages/repository/src/git.ts";
import {
  analyzeRepository,
  captureSourcesToDirectory,
} from "../packages/repository/src/index.ts";

vi.mock("node:fs/promises", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:fs/promises")>()),
}));

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    roots
      .splice(0)
      .map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await fs.mkdtemp(join(tmpdir(), "journey-publication-"));
  roots.push(root);
  const repositoryPath = join(root, "checkout");
  await fs.mkdir(repositoryPath);
  const git = (args: string[]) =>
    execFileSync("git", args, { cwd: repositoryPath });
  git(["init", "--quiet"]);
  git(["config", "user.name", "Fixture"]);
  git(["config", "user.email", "fixture@example.test"]);
  await fs.writeFile(join(repositoryPath, "source.ts"), "exact\r\nlast");
  git(["add", "source.ts"]);
  git(["commit", "--quiet", "-m", "Synthetic source"]);
  const snapshot = await analyzeRepository({
    repositoryPath,
    outputDirectory: join(root, "unused"),
  });
  const options = {
    repositoryPath,
    snapshot,
    request: {
      schemaVersion: 1,
      selections: [{ path: "source.ts", lines: { start: 1, end: 2 } }],
    },
    outputDirectory: join(root, "result"),
  };
  return { root, options };
}
test("concurrent publication has one complete winner and never overwrites existing output", async () => {
  const { root, options } = await fixture();
  const results = await Promise.allSettled([
    captureSourcesToDirectory(options),
    captureSourcesToDirectory(options),
  ]);
  expect(
    results.filter((result) => result.status === "fulfilled"),
  ).toHaveLength(1);
  const path = join(options.outputDirectory, "source-capture.json");
  const bytes = await fs.readFile(path, "utf8");
  const capture = await validateSourceCapture(
    JSON.parse(bytes),
    options.snapshot,
  );
  expect(capture.entries[0]?.text).toBe("exact\r\nlast");
  expect(results.find((result) => result.status === "fulfilled")).toMatchObject(
    { value: await fs.realpath(path) },
  );
  await expect(captureSourcesToDirectory(options)).rejects.toThrow();
  expect(await fs.readFile(path, "utf8")).toBe(bytes);
  expect(await fs.readdir(root)).toEqual(["checkout", "result"]);
});
test("outputs inside any checkout, including symlinked parents and worktree git files, are rejected before creation", async () => {
  const { root, options } = await fixture();
  const other = join(root, "other");
  await fs.mkdir(other);
  await fs.writeFile(join(other, ".git"), "gitdir: elsewhere");
  await fs.symlink(other, join(root, "alias"));
  for (const base of [options.repositoryPath, other, join(root, "alias")]) {
    await expect(
      captureSourcesToDirectory({
        ...options,
        outputDirectory: join(base, "new", "out"),
      }),
    ).rejects.toThrow("outside Git checkouts");
    await expect(fs.access(join(base, "new"))).rejects.toThrow();
  }
});
test("invalid inputs and pre-cancellation leave no output or staging directory", async () => {
  const { root, options } = await fixture();
  await expect(
    captureSourcesToDirectory({ ...options, request: {} }),
  ).rejects.toThrow();
  await expect(
    captureSourcesToDirectory({ ...options, signal: AbortSignal.abort() }),
  ).rejects.toMatchObject({ code: "canceled" });
  expect(await fs.readdir(root)).toEqual(["checkout"]);
});
test("write failure and cancellation after staging discard the reservation and staged artifact", async () => {
  const { root, options } = await fixture();
  vi.spyOn(fs, "rename").mockRejectedValueOnce(
    new Error("Synthetic rename failure"),
  );
  await expect(captureSourcesToDirectory(options)).rejects.toThrow(
    "Synthetic rename failure",
  );
  expect(await fs.readdir(root)).toEqual(["checkout"]);
  vi.restoreAllMocks();
  const controller = new AbortController();
  const writeFile = fs.writeFile;
  vi.spyOn(fs, "writeFile").mockImplementationOnce(async (...args) => {
    await writeFile(...args);
    controller.abort();
  });
  await expect(
    captureSourcesToDirectory({ ...options, signal: controller.signal }),
  ).rejects.toMatchObject({ code: "canceled" });
  expect(await fs.readdir(root)).toEqual(["checkout"]);
});

async function stalledGit(
  root: string,
  descendant = false,
  parentExits = false,
) {
  const bin = join(root, "trusted-bin");
  await fs.mkdir(bin);
  const marker = join(root, "child-pid");
  const descendantMarker = join(root, "descendant-pid");
  await fs.writeFile(
    join(bin, "git"),
    `#!${process.execPath}\nrequire('node:fs').writeFileSync(${JSON.stringify(marker)},String(process.pid));${parentExits ? "" : "process.on('SIGTERM',()=>{});"}${descendant ? `require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(`require('node:fs').writeFileSync(${JSON.stringify(descendantMarker)},String(process.pid));process.on('SIGTERM',()=>{});setInterval(()=>{},1000);`)}],{stdio:${parentExits ? "'ignore'" : "'inherit'"}});` : ""}setInterval(()=>{},1000);\n`,
  );
  await fs.chmod(join(bin, "git"), 0o755);
  const priorPath = process.env.PATH;
  process.env.PATH = `${bin}:${priorPath}`;
  let pid: number | undefined;
  return {
    async wait() {
      const end = Date.now() + 3000;
      while (Date.now() < end) {
        try {
          pid = Number(await fs.readFile(marker, "utf8"));
          return pid;
        } catch {}
        await delay(10);
      }
      throw new Error("Trusted Git wrapper did not start");
    },
    async descendantPid() {
      for (let attempt = 0; attempt < 300; attempt++) {
        try {
          return Number(await fs.readFile(descendantMarker, "utf8"));
        } catch {}
        await delay(10);
      }
      throw new Error("Trusted descendant did not start");
    },
    cleanup() {
      process.env.PATH = priorPath;
      if (pid) {
        try {
          process.kill(pid, "SIGKILL");
        } catch {}
      }
    },
  };
}
test("cancellation kills a Git child that ignores SIGTERM and publishes nothing", async () => {
  const { root, options } = await fixture();
  const wrapper = await stalledGit(root);
  const controller = new AbortController();
  const operation = captureSourcesToDirectory({
    ...options,
    signal: controller.signal,
  });
  try {
    const pid = await wrapper.wait();
    controller.abort();
    await expect(
      Promise.race([
        operation,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Child remained alive after cancellation")),
            1500,
          ),
        ),
      ]),
    ).rejects.toMatchObject({ code: "canceled" });
    expect(() => process.kill(pid, 0)).toThrow();
    await expect(fs.access(options.outputDirectory)).rejects.toThrow();
  } finally {
    wrapper.cleanup();
    await operation.catch(() => {});
  }
}, 5000);
test("the fixed overall deadline kills a stalled Git child and publishes nothing", async () => {
  const { root, options } = await fixture();
  const wrapper = await stalledGit(root);
  const started = Date.now();
  const operation = captureSourcesToDirectory(options);
  try {
    const pid = await wrapper.wait();
    await expect(operation).rejects.toMatchObject({ code: "timeout" });
    expect(Date.now() - started).toBeLessThan(35000);
    expect(() => process.kill(pid, 0)).toThrow();
    await expect(fs.access(options.outputDirectory)).rejects.toThrow();
  } finally {
    wrapper.cleanup();
    await operation.catch(() => {});
  }
}, 40000);

test("cancellation during rename removes the newly published artifact", async () => {
  const { root, options } = await fixture();
  const controller = new AbortController();
  const rename = fs.rename;
  vi.spyOn(fs, "rename").mockImplementationOnce(async (...args) => {
    await rename(...args);
    controller.abort();
  });
  await expect(
    captureSourcesToDirectory({ ...options, signal: controller.signal }),
  ).rejects.toMatchObject({ code: "canceled" });
  expect(await fs.readdir(root)).toEqual(["checkout"]);
});

test("elapsed deadline during rename removes the newly published artifact", async () => {
  const { root, options } = await fixture();
  const rename = fs.rename;
  const now = Date.now;
  vi.spyOn(fs, "rename").mockImplementationOnce(async (...args) => {
    await rename(...args);
    vi.spyOn(Date, "now").mockImplementation(() => now() + 30001);
  });
  await expect(captureSourcesToDirectory(options)).rejects.toMatchObject({
    code: "timeout",
  });
  expect(await fs.readdir(root)).toEqual(["checkout"]);
});

test("Git timeout retains its error code when termination escalates", async () => {
  const { root, options } = await fixture();
  const wrapper = await stalledGit(root);
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const operation = runGit(options.repositoryPath, ["rev-parse", "HEAD"]);
  const outcome = operation.catch((error: unknown) => error);
  try {
    const pid = await wrapper.wait();
    await vi.advanceTimersByTimeAsync(gitTimeoutMs + 250);
    expect(await outcome).toMatchObject({ code: "timeout" });
    expect(() => process.kill(pid, 0)).toThrow();
  } finally {
    vi.useRealTimers();
    wrapper.cleanup();
    await outcome;
  }
}, 5000);

test("cancellation kills Git descendants that keep output pipes open", async () => {
  const { root, options } = await fixture();
  const wrapper = await stalledGit(root, true);
  const controller = new AbortController();
  const operation = captureSourcesToDirectory({
    ...options,
    signal: controller.signal,
  });
  let descendant: number | undefined;
  try {
    await wrapper.wait();
    descendant = await wrapper.descendantPid();
    controller.abort();
    await expect(
      Promise.race([
        operation,
        delay(1500).then(() => {
          throw new Error("Descendant kept capture pending");
        }),
      ]),
    ).rejects.toMatchObject({ code: "canceled" });
    expect(() => process.kill(descendant ?? 0, 0)).toThrow();
    await expect(fs.access(options.outputDirectory)).rejects.toThrow();
  } finally {
    wrapper.cleanup();
    if (descendant) {
      try {
        process.kill(descendant, "SIGKILL");
      } catch {}
    }
    await operation.catch(() => {});
  }
}, 5000);

test("cancellation kills silent Git descendants after their parent exits", async () => {
  const { root, options } = await fixture();
  const wrapper = await stalledGit(root, true, true);
  const controller = new AbortController();
  const operation = captureSourcesToDirectory({
    ...options,
    signal: controller.signal,
  });
  let descendant: number | undefined;
  try {
    await wrapper.wait();
    descendant = await wrapper.descendantPid();
    controller.abort();
    await expect(operation).rejects.toMatchObject({ code: "canceled" });
    await delay(300);
    expect(() => process.kill(descendant ?? 0, 0)).toThrow();
    await expect(fs.access(options.outputDirectory)).rejects.toThrow();
  } finally {
    wrapper.cleanup();
    if (descendant) {
      try {
        process.kill(descendant, "SIGKILL");
      } catch {}
    }
    await operation.catch(() => {});
  }
}, 5000);
