import { expect, test } from "vitest";

import { demoSnapshot } from "../apps/web/src/demo-snapshot.ts";
import {
  loadSelectedSnapshot,
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
