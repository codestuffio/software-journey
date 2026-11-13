import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const cli = fileURLToPath(
  new URL("../apps/cli/dist/index.js", import.meta.url),
);

test("plans reuse, shared evidence updates, and removals from pinned Git revisions", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "sj-plan-fixture-"));
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  const commit = () => {
    git("add", "--all");
    git(
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.test",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "-qm",
      "Fixture",
    );
    return git("rev-parse", "HEAD");
  };
  const plan = (baseline: string, target: string) =>
    spawnSync(
      process.execPath,
      [
        cli,
        "plan-walkthrough",
        "--repository",
        cwd,
        "--baseline",
        baseline,
        "--target",
        target,
      ],
      { encoding: "utf8" },
    );
  const chapters = [
    { id: "overview", title: "Overview", paths: ["src/shared.ts"] },
    { id: "billing", title: "Billing", paths: ["src"] },
    { id: "profile", title: "Profile", paths: ["profile.ts"] },
    { id: "retired", title: "Retired flow", paths: ["profile.ts"] },
  ];
  const catalog = (items = chapters) =>
    writeFile(
      join(cwd, ".github/journey-chapters.json"),
      JSON.stringify({ schemaVersion: 1, chapters: items }),
    );

  try {
    git("init", "-q", "-b", "main");
    await mkdir(join(cwd, "src"));
    await mkdir(join(cwd, ".github"));
    await writeFile(join(cwd, "src/shared.ts"), "initial content\n");
    await writeFile(join(cwd, "profile.ts"), "profile content\n");
    const beforeCatalog = commit();
    await catalog();
    const baseline = commit();
    git("branch", "journey");

    const firstRun = plan(beforeCatalog, baseline);
    expect(firstRun.status).toBe(0);
    expect(firstRun.stdout).toContain(
      "Reuse candidates (0) · Updates (4) · Removals (0)",
    );
    expect(firstRun.stdout).toContain("The baseline has no chapter catalog");

    await writeFile(join(cwd, "notes.txt"), "outside the chapter catalog\n");
    const unrelated = commit();
    const noChange = plan(baseline, unrelated);
    expect(noChange.status).toBe(0);
    expect(noChange.stdout).toContain(
      "Reuse candidates (4) · Updates (0) · Removals (0)",
    );
    expect(noChange.stdout).toContain(
      "0 input tokens + 0 output tokens · $0.00000 USD",
    );

    await writeFile(
      join(cwd, "src/shared.ts"),
      "source text must stay out of the report\n",
    );
    await catalog(chapters.slice(0, 3));
    const main = commit();
    git("switch", "journey");
    await writeFile(join(cwd, "journey-notes.txt"), "branch-only notes\n");
    const journey = commit();
    git(
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.test",
      "-c",
      "commit.gpgsign=false",
      "merge",
      "--no-ff",
      "-m",
      "Proposed merge",
      main,
    );
    const target = git("rev-parse", "HEAD");
    await writeFile(join(cwd, "profile.ts"), "working-tree edit\n");

    const update = plan(journey, target);
    expect(update.status).toBe(0);
    expect(update.stdout).toContain(
      "Reuse candidates (1) · Updates (2) · Removals (1)",
    );
    expect(update.stdout).toContain(
      "| Overview | Update | Changed or unavailable evidence in `src/shared.ts` |",
    );
    expect(update.stdout).toContain(
      "| Billing | Update | Changed or unavailable evidence in `src` |",
    );
    expect(update.stdout).toContain("| Profile | Reuse candidate |");
    expect(update.stdout).toContain("| Retired flow | Remove |");
    expect(update.stdout).toContain(
      "16384 input tokens + 1400 output tokens · $0.00234 USD",
    );
    expect(update.stdout).not.toContain("source text must stay out");

    const missing = plan("1".repeat(40), target);
    expect(missing.status).toBe(1);
    expect(missing.stdout).toBe("");
    expect(missing.stderr).toContain(
      "is unavailable. Check the revision and checkout history.",
    );

    await writeFile(join(cwd, ".github/journey-chapters.json"), "{bad json");
    const invalid = plan(baseline, commit());
    expect(invalid.status).toBe(1);
    expect(invalid.stdout).toBe("");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
}, 15_000);
