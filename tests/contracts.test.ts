import { expect, test } from "vitest";

import {
  createExplorerProjection,
  createWorkflowExplorerProjection,
  explorerLimits,
  validateEvaluationReportForWrite,
  validateSnapshotForWrite,
  validateWorkflowBundleForWrite,
} from "../packages/contracts/src/index.ts";

const sha = "a".repeat(40);
const identity = `sha256:${"b".repeat(64)}`;

function validSnapshot() {
  return {
    schemaVersion: 1,
    contentIdentity: identity,
    repository: { id: identity, headCommit: sha },
    inventory: [{ path: "README.md", objectId: sha, mode: "file" }],
    documentation: [
      {
        contentId: identity,
        source: {
          repositoryId: identity,
          commitSha: sha,
          path: "README.md",
          lines: { start: 1, end: 2 },
        },
        text: "# Software Journey",
      },
    ],
    history: [
      {
        sha,
        parentShas: [],
        authoredAt: "2026-09-20T00:00:00.000Z",
        subject: "Initial commit",
      },
    ],
    coverage: {
      inventory: { discoveredEntries: 1, recordedEntries: 1 },
      documentation: {
        eligibleFiles: 1,
        extractedFiles: 1,
        extractedBytes: 18,
      },
      history: {
        requestedCommits: 200,
        recordedCommits: 1,
        completeness: "complete",
      },
      omissions: [],
    },
    run: {
      analyzerVersion: "0.0.0",
      startedAt: "2026-09-20T00:00:00.000Z",
      completedAt: "2026-09-20T00:00:01.000Z",
      durationMs: 1000,
    },
  };
}

test("snapshot write validation accepts a traceable versioned snapshot", () => {
  const snapshot = validateSnapshotForWrite(validSnapshot());

  expect(snapshot.schemaVersion).toBe(1);
  expect(snapshot.documentation[0]?.source.lines?.start).toBe(1);
});

test("evaluation reports require bounded cited outcomes", () => {
  const report = validateEvaluationReportForWrite({
    schemaVersion: 1,
    repository: validSnapshot().repository,
    catalogId: "demo",
    evaluatedAt: "2026-09-20T00:00:01.000Z",
    results: [
      {
        caseId: "entry",
        status: "passed",
        expectedSource: validSnapshot().documentation[0]?.source,
        observedSource: validSnapshot().documentation[0]?.source,
      },
    ],
    omissions: [],
  });
  expect(report.results[0]?.status).toBe("passed");
  expect(() =>
    validateEvaluationReportForWrite({ ...report, results: [] }),
  ).toThrow();
});

test("workflow bundles keep source evidence bounded and revision-pinned", () => {
  const snapshot = validSnapshot();
  const bundle = {
    schemaVersion: 1,
    contentIdentity: identity,
    workflow: { id: "openspec-new-change", catalogVersion: "1" },
    snapshot: {
      contentIdentity: snapshot.contentIdentity,
      repository: snapshot.repository,
    },
    collectedAt: "2026-09-20T00:00:01.000Z",
    steps: [
      {
        id: "command",
        kind: "command",
        label: "Command entry",
        evidence: {
          type: "source",
          contentId: identity,
          source: snapshot.documentation[0].source,
          text: "x".repeat(32_001),
        },
      },
    ],
    omissions: [],
  };

  expect(validateWorkflowBundleForWrite(bundle).workflow.id).toBe(
    "openspec-new-change",
  );
  expect(
    createWorkflowExplorerProjection(bundle).steps[0]?.evidence,
  ).toMatchObject({
    type: "source",
    textTruncated: true,
  });
  expect(() =>
    validateWorkflowBundleForWrite({ ...bundle, steps: [] }),
  ).toThrow();
});

test("snapshot write validation rejects malformed persisted data", () => {
  const invalid = validSnapshot();
  invalid.documentation[0].source.lines = { start: 4, end: 2 };

  expect(() => validateSnapshotForWrite(invalid)).toThrow();
});

test("snapshot write validation rejects unsafe paths", () => {
  const invalid = validSnapshot();
  invalid.inventory[0].path = "notes\nunsafe.md";

  expect(() => validateSnapshotForWrite(invalid)).toThrow();
});

test("explorer projection labels a bounded documentation view", () => {
  const snapshot = validSnapshot();
  snapshot.documentation = Array.from(
    { length: explorerLimits.maximumDocumentationExtracts + 1 },
    (_, index) => ({
      ...snapshot.documentation[0],
      contentId: `sha256:${index.toString(16).padStart(64, "0")}`,
      source: {
        ...snapshot.documentation[0].source,
        path: `docs/note-${index}.md`,
      },
      text: "x".repeat(explorerLimits.maximumExtractTextCharacters + 1),
    }),
  );

  const projection = createExplorerProjection(snapshot);

  expect(projection.totalDocumentationExtracts).toBe(
    explorerLimits.maximumDocumentationExtracts + 1,
  );
  expect(projection.documentation).toHaveLength(
    explorerLimits.maximumDocumentationExtracts,
  );
  expect(projection.projectionTruncated).toBe(true);
  expect(projection.documentation[0]?.textTruncated).toBe(true);
});
