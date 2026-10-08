import { dirname, resolve } from "node:path";
import {
  answerAssessmentsSchema,
  answerBenchmarkSchema,
  answerComparisonReportSchema,
  answerEvaluationLimits,
  answerEvidenceManifestSchema,
  answerTrialsSchema,
  retrievalLimits,
  validateRetrievalInputs,
} from "@software-journey/contracts";
import { writeExclusiveArtifact } from "./artifact-output.js";
import { readBoundedJson } from "./artifacts.js";

export async function loadAnswerComparisonInputs(
  paths: {
    benchmark: string;
    trials: string;
    assessments: string;
    evidence: string;
  },
  signal?: AbortSignal,
) {
  const read = (path: string) =>
    readBoundedJson(path, answerEvaluationLimits.inputBytes, signal);
  const benchmark = answerBenchmarkSchema.parse(await read(paths.benchmark));
  const trials = answerTrialsSchema.parse(await read(paths.trials));
  const assessments = answerAssessmentsSchema.parse(
    await read(paths.assessments),
  );
  const manifest = answerEvidenceManifestSchema.parse(
    await read(paths.evidence),
  );
  if (
    manifest.schemaVersion === 2 &&
    manifest.artifacts.some((entry) => entry.sources != null)
  )
    throw new Error("Selected-source answer comparison is not implemented");
  const base = dirname(resolve(paths.evidence));
  let remaining: number = answerEvaluationLimits.evidenceBytes;
  const evidence = [];
  const readArtifact = (path: string) =>
    readBoundedJson(
      resolve(base, path),
      Math.min(retrievalLimits.artifactBytes, remaining),
      signal,
      (bytes) => {
        remaining -= bytes;
      },
    );
  for (const entry of manifest.artifacts) {
    signal?.throwIfAborted();
    const snapshot = await readArtifact(entry.snapshot);
    const bundle =
      entry.bundle === null ? undefined : await readArtifact(entry.bundle);
    const validated = await validateRetrievalInputs(snapshot, bundle, signal);
    if (
      validated.snapshot.contentIdentity !== entry.snapshotIdentity ||
      (validated.bundle?.contentIdentity ?? null) !== entry.bundleIdentity
    )
      throw new Error("Manifest artifact identity mismatch");
    evidence.push(validated);
  }
  return { benchmark, trials, assessments, evidence };
}
export async function writeAnswerComparisonReport(
  output: string,
  value: unknown,
  signal?: AbortSignal,
): Promise<string> {
  signal?.throwIfAborted();
  const report = answerComparisonReportSchema.parse(value);
  const text = `${JSON.stringify(report, null, 2)}\n`;
  if (Buffer.byteLength(text) > answerEvaluationLimits.reportBytes)
    throw new Error("Report size limit exceeded");
  return writeExclusiveArtifact(output, "comparison.json", text, signal);
}
