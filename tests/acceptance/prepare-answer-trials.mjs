import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { answerContentDigest } from "../../packages/knowledge/dist/index.js";
import { openSpecAnswerBenchmark } from "../../packages/repository/dist/index.js";

const { values } = parseArgs({
  options: {
    snapshot: { type: "string" },
    bundle: { type: "string" },
    before: { type: "string" },
    after: { type: "string" },
    output: { type: "string" },
  },
  strict: true,
});
if (
  !values.snapshot ||
  !values.bundle ||
  !values.before ||
  !values.after ||
  !values.output
)
  throw new Error("Requires --snapshot --bundle --before --after --output");
const artifacts = [];
for (const [snapshot, bundle] of [
  [values.snapshot, values.bundle],
  [values.before, null],
  [values.after, null],
]) {
  const s = JSON.parse(await readFile(snapshot, "utf8"));
  const b = bundle ? JSON.parse(await readFile(bundle, "utf8")) : null;
  artifacts.push({
    snapshot: resolve(snapshot),
    bundle: bundle ? resolve(bundle) : null,
    snapshotIdentity: s.contentIdentity,
    bundleIdentity: b?.contentIdentity ?? null,
  });
}
await mkdir(values.output); // Deliberately refuses to overwrite an existing directory.
for (const [name, value] of Object.entries({
  benchmark: openSpecAnswerBenchmark,
  trials: { schemaVersion: 1, trials: [] },
  assessments: { schemaVersion: 1, assessments: [] },
  evidence: { schemaVersion: 1, artifacts },
}))
  await writeFile(
    resolve(values.output, `${name}.json`),
    `${JSON.stringify(value, null, 2)}\n`,
  );
console.log(
  `Benchmark digest: ${await answerContentDigest(openSpecAnswerBenchmark)}`,
);
console.log(
  "Empty trial/review templates created. Human reviews and real measurements have not been fabricated.",
);

const trialTemplate = {
  id: "EDIT-trial-id",
  caseId: openSpecAnswerBenchmark.cases[0].id,
  benchmarkDigest: await answerContentDigest(openSpecAnswerBenchmark),
  arm: "direct",
  repetitionId: "EDIT-repetition-id",
  participant: {
    kind: "human",
    configuration: "EDIT-participant-and-session-configuration",
  },
  revisions: openSpecAnswerBenchmark.revisions,
  budgets: { contextBytes: 32768, outputTokens: 1000, timeMs: 900000 },
  provenance: "synthetic",
  protocolNotes:
    "Template only. Replace with recorded order, prior exposure, and measurement notes after a real trial.",
  answer: { text: "REPLACE with the recorded answer", citations: [] },
  metrics: {
    elapsedMs: null,
    toolCalls: null,
    bytes: null,
    tokens: null,
    costUsd: null,
  },
};
await writeFile(
  resolve(values.output, "trial-template.json"),
  `${JSON.stringify(trialTemplate, null, 2)}\n`,
);
