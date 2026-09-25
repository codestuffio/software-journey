import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import {
  discoverEvidence,
  retrieveEvidence,
  serializeEvidenceResponse,
} from "../../packages/knowledge/dist/index.js";
import { openSpecEvaluationCatalog } from "../../packages/repository/dist/evaluation-catalog.js";
import { loadEvidenceArtifacts } from "../../packages/repository/dist/index.js";

const { values } = parseArgs({
  options: {
    snapshot: { type: "string" },
    bundle: { type: "string" },
    output: { type: "string" },
  },
  strict: true,
});
assert(
  values.snapshot && values.bundle && values.output,
  "Requires --snapshot, --bundle, and --output",
);
const signal = AbortSignal.timeout(10000);
const input = await loadEvidenceArtifacts(
  values.snapshot,
  values.bundle,
  signal,
);
assert.equal(
  input.snapshot.repository.id,
  openSpecEvaluationCatalog.repositoryId,
);
assert.equal(
  input.snapshot.repository.headCommit,
  openSpecEvaluationCatalog.commitSha,
);
const results = [];
async function measure(name, request) {
  const start = performance.now();
  const response = await retrieveEvidence(input, request, signal);
  const text = serializeEvidenceResponse(response);
  const bytes = Buffer.byteLength(text);
  assert.equal(bytes, response.budget.returnedBytes);
  assert(bytes <= request.maxBytes);
  results.push({
    case: name,
    status: response.status,
    bytes,
    maxBytes: request.maxBytes,
    elapsedMs: Math.round((performance.now() - start) * 100) / 100,
  });
  return response;
}
for (const item of openSpecEvaluationCatalog.cases) {
  const step = input.bundle.steps.find((step) => step.kind === item.category);
  assert(step);
  const response = await measure(item.id, {
    schemaVersion: 1,
    maxBytes: 262144,
    selector: {
      type: "step",
      workflowId: input.bundle.workflow.id,
      stepId: step.id,
    },
  });
  assert.equal(response.items.length, 1);
  const observed = response.items[0];
  assert.equal(observed.type, step.evidence.type);
  if (step.evidence.type === "source") {
    assert.equal(observed.text, step.evidence.text);
    assert.deepEqual(observed.source, step.evidence.source);
    assert.equal(observed.source.path, item.expectedSource.path);
    assert.equal(observed.source.commitSha, item.expectedSource.commitSha);
  } else {
    assert.equal(step.evidence.type, "history");
    assert.deepEqual(observed.commit, step.evidence.commit);
    assert.equal(observed.commit.sha, item.expectedSource.commitSha);
    assert(!("source" in observed));
  }
}
const first = input.bundle.steps.find(
  (step) => step.evidence.type === "source" && step.evidence.text.length > 4096,
);
assert(first);
const reduced = await measure("reduced-budget", {
  schemaVersion: 1,
  maxBytes: 4096,
  selector: {
    type: "step",
    workflowId: input.bundle.workflow.id,
    stepId: first.id,
  },
});
assert.equal(reduced.status, "partial");
assert(reduced.budget.omittedLines > 0);
assert(first.evidence.text.startsWith(reduced.items[0].text));
const unavailable = await measure("missing-evidence", {
  schemaVersion: 1,
  maxBytes: 4096,
  selector: { type: "path", path: "__retrieval_missing_evidence__" },
});
assert.equal(unavailable.status, "unavailable");
let offset = 0;
let descriptors = 0;
let pages = 0;
do {
  const page = await discoverEvidence(
    input,
    { maxBytes: 4096, offset },
    signal,
  );
  const bytes = Buffer.byteLength(serializeEvidenceResponse(page));
  assert(bytes <= 4096);
  descriptors += page.items.length;
  pages++;
  if (page.nextOffset === null) {
    assert.equal(descriptors, page.totalItems);
    break;
  }
  assert(page.nextOffset > offset);
  offset = page.nextOffset;
} while (offset > 0);
const report = {
  repository: input.snapshot.repository,
  inputs: {
    snapshot: input.snapshot.contentIdentity,
    bundle: input.bundle.contentIdentity,
  },
  results,
  discovery: { pages, descriptors },
  scope:
    "Captured-evidence equality and byte budgets only; no semantic answer-quality or token-savings measurement.",
};
await mkdir(dirname(values.output), { recursive: true });
await writeFile(values.output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
