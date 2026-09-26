import { execFileSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, test } from "vitest";
import { answerEvaluationLimits } from "../packages/contracts/src/index.ts";
import { compareAnswers } from "../packages/knowledge/src/answer-evaluation.ts";
import {
  loadAnswerComparisonInputs,
  writeAnswerComparisonReport,
} from "../packages/repository/src/answer-evaluation.ts";
import { answerFixture } from "./fixtures/answer-evaluation.ts";
import { required } from "./fixtures/retrieval.ts";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((d) => rm(d, { recursive: true, force: true })),
  );
});
async function setup() {
  const dir = await mkdtemp(join(tmpdir(), "journey-answers-"));
  directories.push(dir);
  const f = await answerFixture();
  const paths = {
    benchmark: join(dir, "benchmark.json"),
    trials: join(dir, "trials.json"),
    assessments: join(dir, "assessments.json"),
    evidence: join(dir, "evidence.json"),
  };
  for (const key of ["benchmark", "trials", "assessments"] as const)
    await writeFile(paths[key], JSON.stringify(f[key]));
  await writeFile(join(dir, "snapshot.json"), JSON.stringify(f.input.snapshot));
  await writeFile(join(dir, "bundle.json"), JSON.stringify(f.input.bundle));
  const manifest = {
    schemaVersion: 1,
    artifacts: [
      {
        snapshot: "snapshot.json",
        bundle: "bundle.json",
        snapshotIdentity: f.input.snapshot.contentIdentity,
        bundleIdentity: f.input.bundle.contentIdentity,
      },
    ],
  };
  await writeFile(paths.evidence, JSON.stringify(manifest));
  const report = await compareAnswers(f.benchmark, f.trials, f.assessments, [
    f.input,
  ]);
  return { dir, f, paths, report, manifest };
}
test("relative manifest paths resolve locally and output is atomic and exclusive", async () => {
  const f = await setup();
  expect(
    (await loadAnswerComparisonInputs(f.paths)).evidence[0]?.snapshot
      .contentIdentity,
  ).toBe(f.f.input.snapshot.contentIdentity);
  const output = join(f.dir, "result");
  const results = await Promise.allSettled([
    writeAnswerComparisonReport(output, f.report),
    writeAnswerComparisonReport(output, f.report),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(
    JSON.parse(await readFile(join(output, "comparison.json"), "utf8")),
  ).toEqual(f.report);
  await expect(writeAnswerComparisonReport(output, f.report)).rejects.toThrow(
    "already exists",
  );
  expect((await readdir(f.dir)).filter((p) => p.includes(".tmp-"))).toEqual([]);
});
test("manifest mismatches, non-regular input, malformed JSON, and input size bounds fail", async () => {
  const f = await setup();
  required(f.manifest.artifacts[0]).snapshotIdentity =
    `sha256:${"0".repeat(64)}`;
  await writeFile(f.paths.evidence, JSON.stringify(f.manifest));
  await expect(loadAnswerComparisonInputs(f.paths)).rejects.toThrow(
    "Manifest artifact identity mismatch",
  );
  await expect(
    loadAnswerComparisonInputs({ ...f.paths, benchmark: f.dir }),
  ).rejects.toThrow("regular file");
  await writeFile(f.paths.benchmark, "{");
  await expect(loadAnswerComparisonInputs(f.paths)).rejects.toThrow();
  await writeFile(
    f.paths.benchmark,
    " ".repeat(answerEvaluationLimits.inputBytes + 1),
  );
  await expect(loadAnswerComparisonInputs(f.paths)).rejects.toThrow(
    "size limit",
  );
});
test("checkout and symlink checkout outputs are rejected before directory creation", async () => {
  const f = await setup();
  const checkout = join(f.dir, "checkout");
  await mkdir(checkout);
  await writeFile(join(checkout, ".git"), "gitdir: elsewhere");
  const link = join(f.dir, "link");
  await symlink(checkout, link);
  await expect(
    writeAnswerComparisonReport(join(checkout, "new", "out"), f.report),
  ).rejects.toThrow("outside Git checkouts");
  await expect(
    writeAnswerComparisonReport(join(link, "new", "out"), f.report),
  ).rejects.toThrow("outside Git checkouts");
  expect(await readdir(checkout)).toEqual([".git"]);
});
test("cancellation before publication and report size limits expose no completed report", async () => {
  const f = await setup();
  const output = join(f.dir, "canceled");
  await expect(
    writeAnswerComparisonReport(
      output,
      f.report,
      AbortSignal.abort(new Error("canceled")),
    ),
  ).rejects.toThrow("canceled");
  const controller = new AbortController();
  setTimeout(() => controller.abort(new Error("deadline")), 0);
  await expect(
    writeAnswerComparisonReport(output, f.report, controller.signal),
  ).rejects.toThrow("deadline");
  expect(
    (await readdir(f.dir)).filter((p) => p.startsWith("canceled")),
  ).toEqual([]);
  const huge = structuredClone(f.report);
  huge.trials = Array.from({ length: 100 }, () => {
    const t = structuredClone(required(f.report.trials[0]));
    t.trial.answer.text = "x".repeat(65536);
    return t;
  });
  await expect(writeAnswerComparisonReport(output, huge)).rejects.toThrow(
    "Report size limit",
  );
  expect(
    (await readdir(f.dir)).filter((p) => p.startsWith("canceled")),
  ).toEqual([]);
});
test("compiled comparison CLI assembles inert local artifacts with network and child processes blocked", async () => {
  const f = await setup();
  const cli = resolve("apps/cli/dist/index.js");
  const guard = join(f.dir, "guard.mjs");
  await writeFile(
    guard,
    `import child from 'node:child_process'; import net from 'node:net'; import http from 'node:http'; import https from 'node:https'; import {syncBuiltinESMExports} from 'node:module'; const deny=()=>{throw new Error('Forbidden process or network access')}; for(const k of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])child[k]=deny; net.Socket.prototype.connect=deny;http.request=deny;https.request=deny;globalThis.fetch=deny;syncBuiltinESMExports();`,
  );
  const args = [
    "compare-answers",
    ...Object.entries(f.paths).flatMap(([k, v]) => [`--${k}`, v]),
    "--output",
    join(f.dir, "cli-result"),
  ];
  const run = (a: string[]) =>
    execFileSync(process.execPath, ["--import", guard, cli, ...a], {
      cwd: f.dir,
      env: { ...process.env, PATH: "", OPENAI_API_KEY: "" },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  const before = await readFile(f.paths.trials, "utf8");
  expect(run(args)).toContain(
    "Matched pairs: 1; real quality-passing pairs: 0",
  );
  expect(
    JSON.parse(
      await readFile(join(f.dir, "cli-result/comparison.json"), "utf8"),
    ),
  ).toEqual(f.report);
  expect(await readFile(f.paths.trials, "utf8")).toBe(before);
  for (const extra of [
    ["--unknown", "x"],
    ["--trials", f.paths.trials],
    ["--output"],
  ])
    expect(() => run([...args, ...extra])).toThrow();
  expect(() => run(["compare-answers"])).toThrow();
  expect(run(["compare-answers", "--help"])).toContain(
    "no Git, model request, or network",
  );
});
