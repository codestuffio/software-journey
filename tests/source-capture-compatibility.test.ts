import { createHash } from "node:crypto";
import { expect, test } from "vitest";
import {
  answerEvidenceManifestSchema,
  discoveryResponseSchema,
  evidenceDescriptorSchema,
  retrievalItemSchema,
  retrievalResponseSchema,
  type SourceCapture,
  sourceCaptureContentIdentity,
  sourceCaptureLimits,
  sourceTextDigest,
  validateRetrievalInputs,
} from "../packages/contracts/src/index.ts";
import { compareAnswers } from "../packages/knowledge/src/answer-evaluation.ts";
import {
  discoverEvidence,
  retrieveEvidence,
  serializeEvidenceResponse,
} from "../packages/knowledge/src/index.ts";
import { answerFixture } from "./fixtures/answer-evaluation.ts";
import {
  evidenceFixture,
  identity,
  pathRequest,
  required,
} from "./fixtures/retrieval.ts";

async function sourcesFixture(): Promise<SourceCapture> {
  const { snapshot } = evidenceFixture();
  const selection = { path: "src/example.ts", lines: { start: 1, end: 1 } };
  const sources: SourceCapture = {
    schemaVersion: 1,
    contentIdentity: identity,
    snapshot: {
      contentIdentity: snapshot.contentIdentity,
      repository: snapshot.repository,
    },
    limits: { ...sourceCaptureLimits },
    selections: [selection],
    entries: [
      {
        selection,
        status: "available",
        blobId: "d".repeat(40),
        fileLineCount: 2,
        actualRange: selection.lines,
        text: "hello\n",
        contentDigest: await sourceTextDigest("hello\n"),
        missingRanges: [],
        reasons: [],
      },
    ],
    blobs: [{ objectId: "d".repeat(40), bytesRead: 6 }],
    coverage: {
      requestedSelections: 1,
      capturedSelections: 1,
      partialSelections: 0,
      unavailableSelections: 0,
      bytesRead: 6,
      bytesReturned: 6,
    },
    run: {
      collectorVersion: "0.0.0",
      startedAt: "2026-10-06T00:00:00Z",
      completedAt: "2026-10-06T00:00:01Z",
      durationMs: 1000,
    },
  };
  sources.contentIdentity = await sourceCaptureContentIdentity(sources);
  return sources;
}
const legacyManifest = {
  schemaVersion: 1,
  artifacts: [
    {
      snapshot: "snapshot.json",
      bundle: null,
      snapshotIdentity: identity,
      bundleIdentity: null,
    },
  ],
};
test("legacy manifests parse without injecting source fields", () => {
  expect(answerEvidenceManifestSchema.parse(legacyManifest)).toEqual(
    legacyManifest,
  );
});
test("version 2 manifests accept omitted, null, and paired source artifacts", () => {
  for (const fields of [
    {},
    { sources: null, sourcesIdentity: null },
    { sources: "sources.json", sourcesIdentity: identity },
  ]) {
    const manifest = {
      schemaVersion: 2,
      artifacts: [{ ...required(legacyManifest.artifacts[0]), ...fields }],
    };
    expect(answerEvidenceManifestSchema.parse(manifest)).toEqual(manifest);
  }
});
test("manifests reject unpaired identities, unsupported versions, and version 1 sidecars", () => {
  for (const fields of [
    { sources: "sources.json" },
    { sourcesIdentity: identity },
    { sources: null, sourcesIdentity: identity },
    { sources: "sources.json", sourcesIdentity: "forged" },
  ]) {
    expect(
      answerEvidenceManifestSchema.safeParse({
        schemaVersion: 2,
        artifacts: [{ ...required(legacyManifest.artifacts[0]), ...fields }],
      }).success,
    ).toBe(false);
  }
  expect(
    answerEvidenceManifestSchema.safeParse({
      ...legacyManifest,
      schemaVersion: 3,
    }).success,
  ).toBe(false);
  expect(
    answerEvidenceManifestSchema.safeParse({
      ...legacyManifest,
      artifacts: [
        {
          ...required(legacyManifest.artifacts[0]),
          sources: "sources.json",
          sourcesIdentity: identity,
        },
      ],
    }).success,
  ).toBe(false);
});
test("input validation binds optional sidecars and preserves the legacy shape", async () => {
  const input = evidenceFixture();
  const sources = await sourcesFixture();
  expect(await validateRetrievalInputs(input.snapshot, input.bundle)).toEqual(
    input,
  );
  expect(
    await validateRetrievalInputs(
      input.snapshot,
      input.bundle,
      undefined,
      sources,
    ),
  ).toEqual({ ...input, sources });
});
test("optional sidecars reject forged digests and mismatched bindings", async () => {
  const input = evidenceFixture();
  const sources = await sourcesFixture();
  const forged = structuredClone(sources);
  forged.contentIdentity = identity;
  await expect(
    validateRetrievalInputs(input.snapshot, undefined, undefined, forged),
  ).rejects.toThrow();
  for (const key of ["contentIdentity", "repository", "revision"] as const) {
    const changed = structuredClone(sources);
    if (key === "contentIdentity")
      changed.snapshot.contentIdentity = `sha256:${"e".repeat(64)}`;
    if (key === "repository")
      changed.snapshot.repository.id = `sha256:${"e".repeat(64)}`;
    if (key === "revision")
      changed.snapshot.repository.headCommit = "e".repeat(40);
    changed.contentIdentity = await sourceCaptureContentIdentity(changed);
    await expect(
      validateRetrievalInputs(input.snapshot, undefined, undefined, changed),
    ).rejects.toThrow();
  }
});
test("contract-ready sidecars cannot be silently ignored by unfinished consumers", async () => {
  const input = { ...evidenceFixture(), sources: await sourcesFixture() };
  await expect(retrieveEvidence(input, pathRequest())).rejects.toThrow(
    "Selected-source retrieval is not implemented",
  );
  await expect(discoverEvidence(input, {})).rejects.toThrow(
    "Selected-source retrieval is not implemented",
  );
});
test("responses accept selected-source provenance and reject missing or mismatched identities", async () => {
  const input = evidenceFixture();
  const sources = await sourcesFixture();
  for (const kind of ["retrieval", "discovery"] as const) {
    const response =
      kind === "retrieval"
        ? await retrieveEvidence(input, pathRequest())
        : await discoverEvidence(input, {});
    const schema =
      kind === "retrieval" ? retrievalResponseSchema : discoveryResponseSchema;
    const item = {
      ...required(response.items[0]),
      origin: "selected-source",
      sourcesIdentity: sources.contentIdentity,
    };
    const enriched = {
      ...response,
      inputs: { ...response.inputs, sources: sources.contentIdentity },
      coverage: { ...response.coverage, selectedSources: sources.coverage },
      items: [item],
    };
    expect(schema.parse(enriched)).toEqual(enriched);
    expect(
      schema.safeParse({
        ...enriched,
        items: [{ ...item, sourcesIdentity: undefined }],
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...enriched, inputs: { ...response.inputs } }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...enriched,
        items: [{ ...item, sourcesIdentity: identity }],
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...enriched, coverage: response.coverage }).success,
    ).toBe(false);
  }
});
test("legacy retrieval and discovery retain their exact serialized bytes", async () => {
  const hashes = [
    [
      "64ac5d09cc7e0f7b72916e2b9c4ecfaa994ec08f4d24baab8f475905cf79dd71",
      "c48dc21a5218d8042b17eaaa1888c6ea2d9ed0f792f09ab3d5068b86a24d35c2",
    ],
    [
      "a6493a7170696b21a076ce22dbcefda997ec3740fb2c1ce033ec66dde7f9d276",
      "aaaf0a85da86feb7d73e5af47ecb7d67d36b5ea36ed29936cae59a1d6a2595a6",
    ],
  ];
  for (const [index, withBundle] of [false, true].entries()) {
    const fixture = evidenceFixture();
    const input = withBundle ? fixture : { snapshot: fixture.snapshot };
    const responses = [
      await retrieveEvidence(input, pathRequest()),
      await discoverEvidence(input, {}),
    ];
    expect(
      responses.map((response) =>
        createHash("sha256")
          .update(serializeEvidenceResponse(response))
          .digest("hex"),
      ),
    ).toEqual(hashes[index]);
  }
});

test.each([
  { label: "final blank line", line: 2, bytesRead: 6 },
  { label: "empty file", line: 1, bytesRead: 0 },
])(
  "selected-source responses can represent $label without relaxing legacy text rules",
  async ({ line, bytesRead }) => {
    const input = evidenceFixture();
    const sources = await sourcesFixture();
    const entry = required(sources.entries[0]);
    entry.selection = { ...entry.selection, lines: { start: line, end: line } };
    sources.selections = [entry.selection];
    entry.actualRange = entry.selection.lines;
    entry.fileLineCount = line;
    entry.text = "";
    entry.contentDigest = await sourceTextDigest("");
    required(sources.blobs[0]).bytesRead = bytesRead;
    sources.coverage.bytesRead = bytesRead;
    sources.coverage.bytesReturned = 0;
    sources.contentIdentity = await sourceCaptureContentIdentity(sources);
    await expect(
      validateRetrievalInputs(input.snapshot, undefined, undefined, sources),
    ).resolves.toMatchObject({ sources });
    const item = {
      id: "selected-source:empty",
      origin: "selected-source",
      sourcesIdentity: sources.contentIdentity,
      status: "available",
      reasons: [],
      type: "source",
      contentId: entry.contentDigest,
      source: {
        repositoryId: input.snapshot.repository.id,
        commitSha: input.snapshot.repository.headCommit,
        path: entry.selection.path,
        lines: entry.actualRange,
      },
      text: "",
      missingRanges: [],
      omittedLines: 0,
    };
    expect(retrievalItemSchema.parse(item)).toEqual(item);
    for (const origin of ["documentation", "workflow"])
      expect(
        retrievalItemSchema.safeParse({
          ...item,
          origin,
          sourcesIdentity: undefined,
        }).success,
      ).toBe(false);
    expect(
      retrievalItemSchema.safeParse({
        ...item,
        source: { ...item.source, lines: null },
      }).success,
    ).toBe(false);
    expect(
      retrievalItemSchema.safeParse({
        ...item,
        source: { ...item.source, lines: { start: line, end: line + 1 } },
      }).success,
    ).toBe(false);
  },
);
test("comparison rejects sidecars even on revisions no case or trial cites", async () => {
  const f = await answerFixture();
  const other = evidenceFixture();
  other.snapshot.repository.headCommit = "e".repeat(40);
  required(other.snapshot.documentation[0]).source.commitSha =
    other.snapshot.repository.headCommit;
  const sources = await sourcesFixture();
  sources.snapshot.repository = other.snapshot.repository;
  sources.contentIdentity = await sourceCaptureContentIdentity(sources);
  const validated = await validateRetrievalInputs(
    other.snapshot,
    undefined,
    undefined,
    sources,
  );
  f.benchmark.revisions.push(other.snapshot.repository.headCommit);
  f.benchmark.revisionIdentities.push({
    repositoryId: other.snapshot.repository.id,
    commitSha: other.snapshot.repository.headCommit,
  });
  await expect(
    compareAnswers(
      f.benchmark,
      { schemaVersion: 1, trials: [] },
      { schemaVersion: 1, assessments: [] },
      [f.input, validated],
    ),
  ).rejects.toThrow("Selected-source answer comparison is not implemented");
});
test("selected-source origins cannot masquerade as history or workflow steps", () => {
  const input = evidenceFixture();
  const history = {
    id: "workflow:history",
    origin: "workflow",
    status: "available",
    reasons: [],
    type: "history",
    commit: required(input.snapshot.history[0]),
  };
  expect(retrievalItemSchema.parse(history)).toEqual(history);
  expect(
    retrievalItemSchema.safeParse({
      ...history,
      origin: "selected-source",
      sourcesIdentity: identity,
    }).success,
  ).toBe(false);
  const descriptor = {
    id: "selected-source:one",
    origin: "selected-source",
    sourcesIdentity: identity,
    status: "available",
    reasons: [],
    selector: { type: "path", path: "README.md" },
    source: null,
    commitSha: null,
    label: null,
  };
  expect(evidenceDescriptorSchema.parse(descriptor)).toEqual(descriptor);
  expect(
    evidenceDescriptorSchema.safeParse({
      ...descriptor,
      selector: { type: "step", workflowId: "example", stepId: "source" },
    }).success,
  ).toBe(false);
  expect(
    evidenceDescriptorSchema.safeParse({
      ...descriptor,
      commitSha: input.snapshot.repository.headCommit,
    }).success,
  ).toBe(false);
});
