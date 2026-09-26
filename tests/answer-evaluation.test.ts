import { createHash } from "node:crypto";
import { expect, test } from "vitest";
import {
  answerBenchmarkSchema,
  answerTrialsSchema,
} from "../packages/contracts/src/index.ts";
import {
  answerContentDigest,
  canonicalAnswerJson,
  compareAnswers,
} from "../packages/knowledge/src/answer-evaluation.ts";
import { answerFixture } from "./fixtures/answer-evaluation.ts";
import { required } from "./fixtures/retrieval.ts";

const compare = async (
  f: Awaited<ReturnType<typeof answerFixture>>,
  evidence = [f.input],
) => compareAnswers(f.benchmark, f.trials, f.assessments, evidence);
test("canonical digest uses SHA-256, ignores object order, and binds answer content", async () => {
  expect(await answerContentDigest({ b: 2, a: 1 })).toBe(
    `sha256:${createHash("sha256").update('{"a":1,"b":2}').digest("hex")}`,
  );
  expect(canonicalAnswerJson({ b: 2, a: 1 })).toBe(
    canonicalAnswerJson({ a: 1, b: 2 }),
  );
  const f = await answerFixture();
  required(f.trials.trials[1]).answer.text += " altered";
  await expect(compare(f)).rejects.toThrow("Stale assessment");
});
test("only real matching reviewed quality-passing pairs qualify; bytes do not become token or cost estimates", async () => {
  const f = await answerFixture("real");
  const report = await compare(f);
  expect(report.counts).toEqual({
    trials: 2,
    pairs: 1,
    eligiblePairs: 1,
    unpairedTrials: 0,
  });
  expect(report.pairs[0]).toMatchObject({
    eligible: true,
    metrics: {
      bytes: { difference: -500 },
      tokens: {
        direct: null,
        retrieval: null,
        difference: null,
        reason: "unknown-measurement",
      },
      costUsd: { difference: null },
    },
  });
  required(f.trials.trials[1]).provenance = "synthetic";
  expect((await compare(f)).pairs[0]).toMatchObject({
    eligible: false,
    reasons: ["synthetic-trial"],
  });
});
test("cheaper incorrect answers retain resource differences without qualifying", async () => {
  const f = await answerFixture("real");
  required(f.assessments.assessments[1]).correctness = {
    outcome: "fail",
    reason: "Wrong required answer point",
  };
  const report = await compare(f);
  expect(report.trials[1]?.quality).toBe("fail");
  expect(report.pairs[0]).toMatchObject({
    eligible: false,
    reasons: ["quality-not-passed"],
    metrics: { bytes: { difference: -500 } },
  });
});
test("absent reviews and unavailable or partial source ranges never establish quality", async () => {
  const f = await answerFixture("real");
  f.assessments.assessments = [];
  expect(
    (await compare(f)).trials.every((t) => t.quality === "unreviewed"),
  ).toBe(true);
  f.benchmark.cases[0] = {
    ...required(f.benchmark.cases[0]),
    expectedCitations: [
      {
        ...required(f.benchmark.cases[0]?.expectedCitations[0]),
        lines: { start: 10, end: 40 },
      },
    ],
  };
  const digest = await answerContentDigest(f.benchmark);
  for (const t of f.trials.trials) t.benchmarkDigest = digest;
  const report = await compare(f);
  expect(report.cases[0]?.available).toBe(false);
  expect(report.trials.every((t) => t.quality === "unavailable")).toBe(true);
});
test("unlike metric scopes stay incomparable and both unmatched arms are explicit", async () => {
  const f = await answerFixture("real");
  required(required(f.trials.trials[1]).metrics.bytes).scope = "all-input";
  expect((await compare(f)).pairs[0]?.metrics.bytes).toMatchObject({
    difference: null,
    reason: "different-measurement-scope",
  });
  required(f.trials.trials[1]).participant.configuration = "other model";
  const report = await compare(f);
  expect(report.counts).toMatchObject({
    pairs: 0,
    eligiblePairs: 0,
    unpairedTrials: 2,
  });
  expect(report.pairs[1]).toMatchObject({
    directId: null,
    retrievalId: "retrieval",
    eligible: false,
  });
});
test("duplicate IDs, ambiguous pairs, unknown questions, stale rubrics, and wrong identities are rejected", async () => {
  const f = await answerFixture();
  expect(() =>
    answerTrialsSchema.parse({
      ...f.trials,
      trials: [...f.trials.trials, required(f.trials.trials[0])],
    }),
  ).toThrow("Duplicate trial");
  f.trials.trials.push({ ...required(f.trials.trials[0]), id: "ambiguous" });
  await expect(compare(f)).rejects.toThrow("Ambiguous pair");
  f.trials.trials.pop();
  required(f.assessments.assessments[0]).rubricVersion = "2";
  await expect(compare(f)).rejects.toThrow("Stale assessment");
  required(f.assessments.assessments[0]).rubricVersion = "1";
  required(f.trials.trials[0]).caseId = "missing";
  await expect(compare(f)).rejects.toThrow("Trial benchmark");
  required(f.trials.trials[0]).caseId = "entry";
  f.input.snapshot.repository.id = `sha256:${"0".repeat(64)}`;
  await expect(compare(f)).rejects.toThrow("Evidence revision mismatch");
});
test("history requires two revisions; absent historical captures remain unavailable", async () => {
  const f = await answerFixture();
  const c = required(f.benchmark.cases[0]);
  c.kind = "history";
  expect(() => answerBenchmarkSchema.parse(f.benchmark)).toThrow(
    "History requires",
  );
  const before = "d".repeat(40);
  f.benchmark.revisions.unshift(before);
  f.benchmark.revisionIdentities.unshift({
    repositoryId: f.benchmark.repositoryId,
    commitSha: before,
  });
  c.expectedCitations.unshift({
    ...required(c.expectedCitations[0]),
    commitSha: before,
  });
  const digest = await answerContentDigest(f.benchmark);
  for (const t of f.trials.trials) {
    t.benchmarkDigest = digest;
    t.revisions = f.benchmark.revisions;
  }
  f.assessments.assessments = [];
  const report = await compare(f);
  expect(report.cases[0]).toMatchObject({
    available: false,
    findings: [
      { available: false, reasons: ["missing-revision-or-lines"] },
      { available: true },
    ],
  });
});
test("citation availability cannot rescue fabricated answer citations or quality judgments", async () => {
  const f = await answerFixture("real");
  required(required(f.trials.trials[1]).answer.citations[0]).path =
    "uncaptured.ts";
  required(f.assessments.assessments[1]).answerDigest =
    await answerContentDigest(required(f.trials.trials[1]).answer);
  expect((await compare(f)).trials[1]).toMatchObject({
    quality: "fail",
    findings: [{ available: false }],
  });
});
test("processing yields so deadline and cancellation can abort before a report is returned", async () => {
  const f = await answerFixture();
  await expect(
    compareAnswers(
      f.benchmark,
      f.trials,
      f.assessments,
      [f.input],
      AbortSignal.abort(new Error("canceled")),
    ),
  ).rejects.toThrow("canceled");
  const controller = new AbortController();
  setTimeout(() => controller.abort(new Error("deadline")), 1);
  await expect(
    compareAnswers(
      f.benchmark,
      f.trials,
      f.assessments,
      [f.input],
      controller.signal,
    ),
  ).rejects.toThrow("deadline");
});

test("collection-truncated evidence disables reference quality even when citation metadata resolves", async () => {
  const f = await answerFixture("real");
  f.input.snapshot.coverage.omissions.push({
    reason: "per-file-byte-limit",
    path: "README.md",
    detail: "Captured excerpt truncated",
  });
  const report = await compare(f);
  expect(report.cases[0]).toMatchObject({ available: false });
  expect(report.cases[0]?.findings[0]?.reasons).toContain(
    "collection-truncated",
  );
  expect(report.trials.every((t) => t.quality === "unavailable")).toBe(true);
  expect(report.counts.eligiblePairs).toBe(0);
});

test("bounded contracts reject oversized case/trial collections and empty assessment reasons", async () => {
  const f = await answerFixture();
  expect(() =>
    answerBenchmarkSchema.parse({
      ...f.benchmark,
      cases: Array.from({ length: 21 }, (_, i) => ({
        ...required(f.benchmark.cases[0]),
        id: `case-${i}`,
      })),
    }),
  ).toThrow();
  expect(() =>
    answerTrialsSchema.parse({
      ...f.trials,
      trials: Array.from({ length: 101 }, (_, i) => ({
        ...required(f.trials.trials[0]),
        id: `trial-${i}`,
      })),
    }),
  ).toThrow();
  required(f.assessments.assessments[0]).correctness.reason = "  \n ";
  await expect(compare(f)).rejects.toThrow("must not be blank");
});
