import type {
  Snapshot,
  WorkflowBundle,
} from "../../packages/contracts/src/index.ts";
export const identity = `sha256:${"b".repeat(64)}`;
export const sha = "a".repeat(40);
export function evidenceFixture(text = "first\r\nsecond\r\nthird") {
  const source = {
    repositoryId: identity,
    commitSha: sha,
    path: "README.md",
    lines: { start: 10, end: 10 + text.split("\n").length - 1 },
  };
  const snapshot: Snapshot = {
    schemaVersion: 1,
    contentIdentity: identity,
    repository: { id: identity, headCommit: sha },
    inventory: [
      { path: "README.md", objectId: sha, mode: "file" },
      { path: "uncaptured.ts", objectId: sha, mode: "file" },
    ],
    documentation: [{ contentId: identity, source, text }],
    history: [
      {
        sha,
        parentShas: [],
        authoredAt: "2026-09-20T00:00:00.000Z",
        subject: "Initial commit",
      },
    ],
    coverage: {
      inventory: { discoveredEntries: 2, recordedEntries: 2 },
      documentation: {
        eligibleFiles: 1,
        extractedFiles: 1,
        extractedBytes: Buffer.byteLength(text),
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
  const bundle: WorkflowBundle = {
    schemaVersion: 1,
    contentIdentity: `sha256:${"c".repeat(64)}`,
    snapshot: { contentIdentity: identity, repository: snapshot.repository },
    workflow: { id: "example", catalogVersion: "1" },
    collectedAt: "2026-09-20T00:00:00.000Z",
    steps: [
      {
        id: "source",
        kind: "implementation",
        label: "Implementation",
        evidence: { type: "source", ...required(snapshot.documentation[0]) },
      },
      {
        id: "history",
        kind: "history",
        label: "Revision",
        evidence: { type: "history", commit: required(snapshot.history[0]) },
      },
    ],
    omissions: [],
  };
  return { snapshot, bundle };
}
export const pathRequest = (path = "README.md", maxBytes = 32768) => ({
  schemaVersion: 1,
  maxBytes,
  selector: { type: "path", path },
});

export function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error("Missing fixture value");
  return value;
}
