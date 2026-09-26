import {
  lstat,
  mkdir,
  mkdtemp,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
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
async function exists(path: string) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
async function canonicalOutput(path: string): Promise<string> {
  const tail: string[] = [];
  let ancestor = resolve(path);
  while (!(await exists(ancestor))) {
    tail.unshift(basename(ancestor));
    const parent = dirname(ancestor);
    if (parent === ancestor) throw new Error("Cannot resolve output parent");
    ancestor = parent;
  }
  return join(await realpath(ancestor), ...tail);
}
async function checkOutput(path: string) {
  let ancestor = path;
  while (true) {
    if (await exists(join(ancestor, ".git")))
      throw new Error("Output must be outside Git checkouts");
    const parent = dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }
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
  const destination = await canonicalOutput(output);
  await checkOutput(destination);
  if (await exists(destination)) throw new Error("Output already exists");
  signal?.throwIfAborted();
  await mkdir(dirname(destination), { recursive: true });
  // Reserve the final name exclusively, preventing rename from replacing another output.
  await mkdir(destination);
  let temporary: string | undefined;
  try {
    temporary = await mkdtemp(`${destination}.tmp-`);
    signal?.throwIfAborted();
    await writeFile(join(temporary, "comparison.json"), text, {
      encoding: "utf8",
      signal,
    });
    await new Promise((resolve) => setImmediate(resolve));
    signal?.throwIfAborted();
    await rename(temporary, destination);
    return join(destination, "comparison.json");
  } catch (error) {
    if (temporary) await rm(temporary, { recursive: true, force: true });
    await rm(destination, { recursive: true, force: true });
    throw error;
  }
}
