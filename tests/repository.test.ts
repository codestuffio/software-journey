import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  analyzeRepository,
  type RepositoryAnalysisError,
  snapshotLimits,
  writeSnapshot,
} from "../packages/repository/src/index.ts";

const temporaryDirectories: string[] = [];

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

async function createFixture(): Promise<string> {
  const repository = await mkdtemp(join(tmpdir(), "software-journey-fixture-"));
  temporaryDirectories.push(repository);
  git(repository, ["init", "--quiet"]);
  git(repository, ["config", "user.email", "fixture@example.test"]);
  git(repository, ["config", "user.name", "Fixture"]);
  await writeFile(join(repository, "README.md"), "# Fixture\n", "utf8");
  await writeFile(join(repository, "notes.md"), "A short note.\n", "utf8");
  await writeFile(
    join(repository, "-option.md"),
    "Option-like path.\n",
    "utf8",
  );
  await writeFile(join(repository, "odd\tpath.md"), "Unsafe path.\n", "utf8");
  await writeFile(join(repository, "binary.md"), Buffer.from([0, 1, 2]));
  await writeFile(join(repository, ".env"), "SECRET=not-read\n", "utf8");
  await writeFile(
    join(repository, "large.md"),
    "x".repeat(snapshotLimits.documentBytes + 1),
    "utf8",
  );
  await writeFile(join(repository, "vendor.md"), "excluded\n", "utf8");
  await symlink("README.md", join(repository, "linked.md"));
  git(repository, ["add", "--all"]);
  git(repository, ["commit", "--quiet", "-m", "First fixture commit"]);
  await writeFile(join(repository, "notes.md"), "A changed note.\n", "utf8");
  git(repository, ["add", "notes.md"]);
  git(repository, ["commit", "--quiet", "-m", "Second fixture commit"]);
  const submoduleCommit = git(repository, ["rev-parse", "HEAD"]);
  git(repository, [
    "update-index",
    "--add",
    "--cacheinfo",
    `160000,${submoduleCommit},modules/fixture`,
  ]);
  git(repository, ["commit", "--quiet", "-m", "Add submodule fixture"]);
  await writeFile(join(repository, "notes.md"), "dirty content\n", "utf8");
  await writeFile(join(repository, "untracked.md"), "untracked\n", "utf8");
  return repository;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("local repository analysis", () => {
  it("creates a committed-HEAD snapshot with explicit coverage and omissions", async () => {
    const repository = await createFixture();
    const outputDirectory = `${repository}-snapshot`;

    const snapshot = await analyzeRepository({
      repositoryPath: repository,
      outputDirectory,
    });
    const manifestPath = await writeSnapshot(
      repository,
      outputDirectory,
      snapshot,
    );
    temporaryDirectories.push(outputDirectory);

    expect(snapshot.repository.headCommit).toMatch(/^[0-9a-f]{40}$/u);
    expect(
      snapshot.documentation.map((extract) => extract.source.path),
    ).toContain("README.md");
    expect(
      snapshot.documentation.map((extract) => extract.source.path),
    ).not.toContain("binary.md");
    expect(
      snapshot.coverage.omissions.map((omission) => omission.reason),
    ).toEqual(
      expect.arrayContaining([
        "binary",
        "default-exclusion",
        "symlink",
        "submodule",
        "unsafe-path-character",
        "per-file-byte-limit",
        "dirty-worktree",
        "untracked-worktree",
      ]),
    );
    expect(JSON.parse(await readFile(manifestPath, "utf8"))).toMatchObject({
      schemaVersion: 1,
    });
  });

  it("keeps content identities stable when the same committed revision is analyzed twice", async () => {
    const repository = await createFixture();

    const first = await analyzeRepository({
      repositoryPath: repository,
      outputDirectory: `${repository}-first`,
    });
    const second = await analyzeRepository({
      repositoryPath: repository,
      outputDirectory: `${repository}-second`,
    });

    expect(first.contentIdentity).toBe(second.contentIdentity);
    expect(first.run.startedAt).not.toBe(second.run.startedAt);
  });

  it("rejects an output directory inside the selected checkout", async () => {
    const repository = await createFixture();

    await expect(
      analyzeRepository({
        repositoryPath: repository,
        outputDirectory: join(repository, ".software-journey"),
      }),
    ).rejects.toMatchObject<Partial<RepositoryAnalysisError>>({
      code: "output-inside-repository",
    });
  });

  it("reports an unborn repository without writing a snapshot", async () => {
    const repository = await mkdtemp(join(tmpdir(), "software-journey-empty-"));
    temporaryDirectories.push(repository);
    git(repository, ["init", "--quiet"]);

    await expect(
      analyzeRepository({
        repositoryPath: repository,
        outputDirectory: `${repository}-snapshot`,
      }),
    ).rejects.toMatchObject<Partial<RepositoryAnalysisError>>({
      code: "no-commits",
    });
  });

  it("labels shallow history without fetching from a remote", async () => {
    const repository = await createFixture();
    const shallowRepository = `${repository}-shallow`;
    temporaryDirectories.push(shallowRepository);
    git(repository, ["config", "uploadpack.allowReachableSHA1InWant", "true"]);
    git(process.cwd(), [
      "clone",
      "--quiet",
      "--depth",
      "1",
      `file://${repository}`,
      shallowRepository,
    ]);

    const snapshot = await analyzeRepository({
      repositoryPath: shallowRepository,
      outputDirectory: `${shallowRepository}-snapshot`,
    });

    expect(snapshot.coverage.history.completeness).toBe("shallow");
  });

  it("does not create output when an analysis is canceled", async () => {
    const repository = await createFixture();
    const outputDirectory = `${repository}-canceled`;
    const controller = new AbortController();
    controller.abort();

    await expect(
      analyzeRepository({
        repositoryPath: repository,
        outputDirectory,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject<Partial<RepositoryAnalysisError>>({
      code: "canceled",
    });
    await expect(
      readFile(join(outputDirectory, "snapshot.json")),
    ).rejects.toThrow();
  });
});
