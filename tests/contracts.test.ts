import { expect, test } from "vitest";

import { validateSnapshotForWrite } from "../packages/contracts/src/index.ts";

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
