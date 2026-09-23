import { expect, test } from "vitest";

import { demoSnapshot } from "../apps/web/src/demo-snapshot.ts";
import {
  loadSelectedSnapshot,
  loadSelectedWorkflow,
  maximumSnapshotFileBytes,
} from "../apps/web/src/snapshot-loader.ts";

test("local snapshot loader validates a selected JSON file", async () => {
  const file = new File([JSON.stringify(demoSnapshot)], "demo.json", {
    type: "application/json",
  });

  const projection = await loadSelectedSnapshot(file);

  expect(projection.repository.headCommit).toBe(
    demoSnapshot.repository.headCommit,
  );
  expect(projection.documentation).toHaveLength(3);
});

test("workflow loader validates local bundles separately from snapshots", async () => {
  const workflow = {
    schemaVersion: 1,
    contentIdentity: demoSnapshot.contentIdentity,
    workflow: { id: "demo", catalogVersion: "1" },
    snapshot: {
      contentIdentity: demoSnapshot.contentIdentity,
      repository: demoSnapshot.repository,
    },
    collectedAt: "2026-09-20T00:00:02.000Z",
    steps: [
      {
        id: "history",
        kind: "history",
        label: "Recorded history",
        evidence: { type: "history", commit: demoSnapshot.history[0] },
      },
    ],
    omissions: [],
  };
  await expect(
    loadSelectedWorkflow(new File([JSON.stringify(workflow)], "trail.json")),
  ).resolves.toMatchObject({ workflow: { id: "demo" } });
  await expect(
    loadSelectedWorkflow(new File(["broken"], "trail.json")),
  ).rejects.toThrow("not valid workflow JSON");
});

test("local snapshot loader rejects malformed and oversized files", async () => {
  await expect(
    loadSelectedSnapshot(new File(["not json"], "broken.json")),
  ).rejects.toThrow("not valid snapshot JSON");

  await expect(
    loadSelectedSnapshot(
      new File(["x".repeat(maximumSnapshotFileBytes + 1)], "large.json"),
    ),
  ).rejects.toThrow("larger than the 8 MB");
});
