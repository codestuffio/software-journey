import { expect, test } from "vitest";
import {
  retrievalRequestSchema,
  retrievalResponseSchema,
} from "../packages/contracts/src/index.ts";
import {
  evaluateRetrievalCases,
  retrieveSnapshot,
} from "../packages/knowledge/src/index.ts";

const sha = "a".repeat(40);
const identity = `sha256:${"b".repeat(64)}`;
const repository = { id: identity, headCommit: sha };
const source = (path: string) => ({
  repositoryId: identity,
  commitSha: sha,
  path,
  lines: { start: 1, end: 2 },
});
const snapshot = {
  schemaVersion: 1,
  contentIdentity: identity,
  repository,
  inventory: [
    { path: "docs/a.md", objectId: sha, mode: "file" },
    { path: "docs/b.md", objectId: sha, mode: "file" },
    { path: "src/index.ts", objectId: sha, mode: "file" },
  ],
  documentation: [
    { contentId: identity, source: source("docs/a.md"), text: "alpha\nbeta" },
    { contentId: identity, source: source("docs/b.md"), text: "gamma\ndelta" },
  ],
  history: [],
  coverage: {
    inventory: { discoveredEntries: 4, recordedEntries: 3 },
    documentation: { eligibleFiles: 2, extractedFiles: 2, extractedBytes: 21 },
    history: {
      requestedCommits: 200,
      recordedCommits: 0,
      completeness: "unavailable",
    },
    omissions: [
      {
        reason: "per-file-byte-limit",
        path: "docs/large.md",
        detail: "Too large.",
      },
    ],
  },
  run: {
    analyzerVersion: "1",
    startedAt: "2026-09-20T00:00:00.000Z",
    completedAt: "2026-09-20T00:00:01.000Z",
    durationMs: 1000,
  },
};

const request = {
  schemaVersion: 1,
  repository,
  snapshotContentIdentity: identity,
  filter: { area: "docs", path: null },
  limits: { maximumEvidence: 1, maximumCharactersPerEvidence: 7 },
};

test("retrieval is bounded, revision-pinned, and reports omissions", () => {
  const response = retrieveSnapshot(snapshot, request);
  expect(retrievalResponseSchema.parse(response)).toEqual(response);
  expect(response.evidence).toHaveLength(1);
  expect(response.evidence[0]).toMatchObject({
    text: "alpha\nb",
    textTruncated: true,
    source: { path: "docs/a.md", lines: { start: 1, end: 2 } },
  });
  expect(response.coverage).toMatchObject({
    matchingInventoryEntries: 2,
    matchingExtracts: 2,
    returnedExtracts: 1,
    omittedByResultLimit: 1,
    matchingSnapshotOmissions: 1,
    resultTruncated: true,
  });
  expect(response.omissions[0]?.path).toBe("docs/large.md");
  expect(() =>
    retrieveSnapshot(snapshot, {
      ...request,
      snapshotContentIdentity: `sha256:${"c".repeat(64)}`,
    }),
  ).toThrow();
  expect(() =>
    retrievalRequestSchema.parse({
      ...request,
      limits: { ...request.limits, maximumEvidence: 25 },
    }),
  ).toThrow();
});

test("exact path retrieval identifies files absent from captured extracts", () => {
  const response = retrieveSnapshot(snapshot, {
    ...request,
    filter: { area: null, path: "src/index.ts" },
  });
  expect(response.evidence).toHaveLength(0);
  expect(response.coverage.unavailableInventoryEntries).toBe(1);
  expect(response.coverage.resultTruncated).toBe(false);
});

test("fixed retrieval cases record resolvable citations and coverage", () => {
  const report = evaluateRetrievalCases(snapshot, "fixture-v1", [
    {
      id: "docs",
      question: "Where?",
      category: "specification",
      expectedSource: source("docs/a.md"),
    },
    {
      id: "code",
      question: "Where?",
      category: "implementation",
      expectedSource: { ...source("src/index.ts"), lines: null },
    },
  ]);
  expect(report.results.map((item) => item.status)).toEqual([
    "resolved",
    "unavailable",
  ]);
  expect(report.results[0]?.observedSource?.path).toBe("docs/a.md");
  expect(report.results[1]?.coverage.unavailableInventoryEntries).toBe(1);
});
