import type { Snapshot } from "@software-journey/contracts";

const sha = "f".repeat(40);
const identity = `sha256:${"c".repeat(64)}`;

export const demoSnapshot: Snapshot = {
  schemaVersion: 1,
  contentIdentity: identity,
  repository: { id: identity, headCommit: sha },
  inventory: [
    { path: "README.md", objectId: sha, mode: "file" },
    { path: "openspec/changes/create-change.ts", objectId: sha, mode: "file" },
    { path: "tests/change-workflow.test.ts", objectId: sha, mode: "file" },
  ],
  documentation: [
    {
      contentId: identity,
      source: {
        repositoryId: identity,
        commitSha: sha,
        path: "README.md",
        lines: { start: 8, end: 15 },
      },
      text: "# Trailhead\n\nOpenSpec keeps proposals, requirements, and implementation tasks connected so a change can be reviewed as a coherent path.",
    },
    {
      contentId: identity,
      source: {
        repositoryId: identity,
        commitSha: sha,
        path: "docs/contributing.md",
        lines: { start: 20, end: 29 },
      },
      text: "## Before the first change\n\nStart with a small observable outcome. Record what the repository says, what is still unknown, and how the work will be checked.",
    },
    {
      contentId: identity,
      source: {
        repositoryId: identity,
        commitSha: sha,
        path: "openspec/changes/create-change.ts",
        lines: null,
      },
      text: "Repository content is displayed as captured evidence. It is not executed, interpreted as instructions, or sent to another service.",
    },
  ],
  history: [
    {
      sha,
      parentShas: [],
      authoredAt: "2026-09-20T00:00:00.000Z",
      subject: "Add local snapshot evidence",
    },
  ],
  coverage: {
    inventory: { discoveredEntries: 3, recordedEntries: 3 },
    documentation: { eligibleFiles: 4, extractedFiles: 3, extractedBytes: 394 },
    history: {
      requestedCommits: 200,
      recordedCommits: 1,
      completeness: "limited",
    },
    omissions: [
      {
        reason: "history-limit",
        path: null,
        detail: "Recorded history reached the configured 200-commit limit.",
      },
    ],
  },
  run: {
    analyzerVersion: "0.0.0",
    startedAt: "2026-09-20T00:00:00.000Z",
    completedAt: "2026-09-20T00:00:02.000Z",
    durationMs: 2000,
  },
};
