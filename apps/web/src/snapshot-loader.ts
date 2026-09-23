import {
  createExplorerProjection,
  createWorkflowExplorerProjection,
  type ExplorerProjection,
  type WorkflowExplorerProjection,
} from "@software-journey/contracts";

export const maximumSnapshotFileBytes = 8 * 1024 * 1024;
export const maximumWorkflowFileBytes = 2 * 1024 * 1024;

export async function loadSelectedSnapshot(
  file: File,
): Promise<ExplorerProjection> {
  if (file.size > maximumSnapshotFileBytes) {
    throw new Error(
      "This snapshot is larger than the 8 MB local explorer limit.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("This file is not valid snapshot JSON.");
  }

  try {
    return createExplorerProjection(parsed);
  } catch {
    throw new Error("This file is not a supported Software Journey snapshot.");
  }
}

export async function loadSelectedWorkflow(
  file: File,
): Promise<WorkflowExplorerProjection> {
  if (file.size > maximumWorkflowFileBytes) {
    throw new Error(
      "This workflow bundle is larger than the 2 MB local explorer limit.",
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("This file is not valid workflow JSON.");
  }
  try {
    return createWorkflowExplorerProjection(parsed);
  } catch {
    throw new Error(
      "This file is not a supported Software Journey workflow bundle.",
    );
  }
}
