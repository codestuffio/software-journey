import {
  type AnswerAssessment,
  type AnswerComparisonReport,
  type AnswerTrial,
  answerAssessmentsSchema,
  answerBenchmarkSchema,
  answerComparisonReportSchema,
  answerTrialsSchema,
  type SourceReference,
} from "@software-journey/contracts";
import { type EvidenceInputs, retrieveEvidence } from "./index.js";

/** Stable object-key ordering; array order remains significant. */
export function canonicalAnswerJson(value: unknown): string {
  return JSON.stringify(value, (_, nested) =>
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? Object.fromEntries(
          Object.entries(nested).sort(([a], [b]) =>
            a < b ? -1 : a > b ? 1 : 0,
          ),
        )
      : nested,
  );
}
export async function answerContentDigest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalAnswerJson(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${Array.from(new Uint8Array(digest), (v) => v.toString(16).padStart(2, "0")).join("")}`;
}
const checkpoint = async (signal?: AbortSignal) => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  signal?.throwIfAborted();
};
async function citationFinding(
  source: SourceReference,
  evidence: EvidenceInputs[],
  signal?: AbortSignal,
) {
  const artifact = evidence.find(
    (e) =>
      e.snapshot.repository.id === source.repositoryId &&
      e.snapshot.repository.headCommit === source.commitSha,
  );
  if (!artifact || !source.lines)
    return { source, available: false, reasons: ["missing-revision-or-lines"] };
  const response = await retrieveEvidence(
    artifact,
    {
      schemaVersion: 1,
      maxBytes: 262144,
      selector: { type: "source", ...source, lines: source.lines },
    },
    signal,
  );
  // Each required range must be fully present in one captured source; metadata alone is insufficient.
  const available = response.items.some(
    (item) =>
      item.type === "source" &&
      item.status === "available" &&
      item.source.lines?.start === source.lines?.start &&
      item.source.lines?.end === source.lines?.end &&
      item.missingRanges.length === 0,
  );
  return {
    source,
    available,
    reasons: available
      ? []
      : [
          ...new Set([
            ...response.reasons,
            ...response.items.flatMap((i) => i.reasons),
            "required-range-unavailable",
          ]),
        ].slice(0, 40),
  };
}
const pairKey = (trial: AnswerTrial) =>
  canonicalAnswerJson({
    caseId: trial.caseId,
    benchmarkDigest: trial.benchmarkDigest,
    repetitionId: trial.repetitionId,
    participant: trial.participant,
    revisions: trial.revisions,
    budgets: trial.budgets,
  });
function metricDifference(
  direct: AnswerTrial["metrics"]["bytes"],
  retrieval: AnswerTrial["metrics"]["bytes"],
) {
  const reason =
    !direct || !retrieval
      ? "unknown-measurement"
      : direct.scope !== retrieval.scope
        ? "different-measurement-scope"
        : null;
  return {
    direct: direct?.value ?? null,
    retrieval: retrieval?.value ?? null,
    difference: reason ? null : (retrieval?.value ?? 0) - (direct?.value ?? 0),
    reason,
    scope: reason ? null : (direct?.scope ?? null),
  };
}
export async function compareAnswers(
  benchmarkValue: unknown,
  trialsValue: unknown,
  assessmentsValue: unknown,
  evidence: EvidenceInputs[],
  signal?: AbortSignal,
): Promise<AnswerComparisonReport> {
  signal?.throwIfAborted();
  const benchmark = answerBenchmarkSchema.parse(benchmarkValue);
  const { trials } = answerTrialsSchema.parse(trialsValue);
  const { assessments } = answerAssessmentsSchema.parse(assessmentsValue);
  const benchmarkDigest = await answerContentDigest(benchmark);
  const revisions = new Set<string>();
  for (const e of evidence) {
    const revision = e.snapshot.repository.headCommit;
    if (
      !benchmark.revisionIdentities.some(
        (r) =>
          r.repositoryId === e.snapshot.repository.id &&
          r.commitSha === revision,
      ) ||
      revisions.has(revision)
    )
      throw new Error("Evidence revision mismatch or duplicate");
    revisions.add(revision);
  }
  const cases: AnswerComparisonReport["cases"] = [];
  for (const c of benchmark.cases) {
    const findings = [];
    for (const source of c.expectedCitations)
      findings.push(await citationFinding(source, evidence, signal));
    cases.push({
      id: c.id,
      available: findings.every((f) => f.available),
      findings,
    });
  }
  const reviewed: AnswerComparisonReport["trials"] = [];
  const assessmentMap = new Map<string, AnswerAssessment>(
    assessments.map((a) => [a.trialId, a]),
  );
  if (assessments.some((a) => !trials.some((t) => t.id === a.trialId)))
    throw new Error("Assessment references unknown trial");
  const armKeys = new Set<string>();
  for (const trial of trials) {
    await checkpoint(signal);
    const c = cases.find((c) => c.id === trial.caseId);
    if (
      !c ||
      trial.benchmarkDigest !== benchmarkDigest ||
      canonicalAnswerJson(trial.revisions) !==
        canonicalAnswerJson(benchmark.revisions)
    )
      throw new Error("Trial benchmark, question, or revision mismatch");
    const key = `${pairKey(trial)}:${trial.arm}`;
    if (armKeys.has(key)) throw new Error("Ambiguous pair key");
    armKeys.add(key);
    const answerDigest = await answerContentDigest(trial.answer);
    const assessment = assessmentMap.get(trial.id) ?? null;
    if (
      assessment &&
      (assessment.answerDigest !== answerDigest ||
        assessment.benchmarkDigest !== benchmarkDigest ||
        assessment.rubricVersion !== benchmark.rubricVersion)
    )
      throw new Error("Stale assessment binding");
    const findings = [];
    for (const source of trial.answer.citations)
      findings.push(await citationFinding(source, evidence, signal));
    const quality = !c.available
      ? "unavailable"
      : !assessment
        ? "unreviewed"
        : [
              assessment.correctness,
              assessment.citationSupport,
              assessment.uncertainty,
            ].every((d) => d.outcome === "pass") &&
            findings.length > 0 &&
            findings.every((f) => f.available)
          ? "pass"
          : "fail";
    reviewed.push({ trial, answerDigest, assessment, quality, findings });
  }
  const pairs: AnswerComparisonReport["pairs"] = [];
  const used = new Set<string>();
  for (const direct of reviewed.filter((t) => t.trial.arm === "direct")) {
    const retrieval = reviewed.find(
      (t) =>
        t.trial.arm === "retrieval" &&
        pairKey(t.trial) === pairKey(direct.trial),
    );
    used.add(direct.trial.id);
    if (retrieval) used.add(retrieval.trial.id);
    const reasons = [];
    if (!retrieval) reasons.push("missing-matching-counterpart");
    if (
      direct.trial.provenance === "synthetic" ||
      retrieval?.trial.provenance === "synthetic"
    )
      reasons.push("synthetic-trial");
    if (direct.quality !== "pass" || retrieval?.quality !== "pass")
      reasons.push("quality-not-passed");
    pairs.push({
      directId: direct.trial.id,
      retrievalId: retrieval?.trial.id ?? null,
      eligible: reasons.length === 0,
      reasons,
      metrics: Object.fromEntries(
        Object.keys(direct.trial.metrics).map((key) => {
          const k = key as keyof AnswerTrial["metrics"];
          return [
            k,
            metricDifference(
              direct.trial.metrics[k],
              retrieval?.trial.metrics[k] ?? null,
            ),
          ];
        }),
      ) as AnswerComparisonReport["pairs"][number]["metrics"],
    });
  }
  for (const retrieval of reviewed.filter((t) => !used.has(t.trial.id))) {
    // Keep unmatched retrieval records explicit.
    pairs.push({
      directId: null,
      retrievalId: retrieval.trial.id,
      eligible: false,
      reasons: ["missing-matching-counterpart"],
      metrics: Object.fromEntries(
        Object.keys(retrieval.trial.metrics).map((k) => [
          k,
          metricDifference(
            null,
            retrieval.trial.metrics[k as keyof AnswerTrial["metrics"]],
          ),
        ]),
      ) as AnswerComparisonReport["pairs"][number]["metrics"],
    });
  }
  await checkpoint(signal);
  return answerComparisonReportSchema.parse({
    schemaVersion: 1,
    benchmarkDigest,
    benchmark,
    evidence: evidence.map((e) => ({
      repositoryId: e.snapshot.repository.id,
      revision: e.snapshot.repository.headCommit,
      snapshotIdentity: e.snapshot.contentIdentity,
      bundleIdentity: e.bundle?.contentIdentity ?? null,
    })),
    cases,
    trials: reviewed,
    pairs,
    counts: {
      trials: trials.length,
      pairs: pairs.filter((p) => p.retrievalId !== null && p.directId !== null)
        .length,
      eligiblePairs: pairs.filter((p) => p.eligible).length,
      unpairedTrials: pairs.filter(
        (p) => p.retrievalId === null || p.directId === null,
      ).length,
    },
    limitations: [
      "Human assessments, participant configuration, and metrics are supplied records, not independently audited.",
      "Synthetic trials validate the harness only. Unreviewed, unavailable, or failed-quality trials establish no quality-preserving savings.",
      "Differences are retrieval minus direct; unknown tokens and account costs stay unknown. Results describe only the recorded sample.",
    ],
  });
}
