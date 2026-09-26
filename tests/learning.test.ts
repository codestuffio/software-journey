import { expect, test } from "vitest";
import {
  evaluateLearningCitations,
  findLearningCatalog,
  learningCatalog,
} from "../apps/web/src/learning-catalog.ts";
import { createWorkflowExplorerProjection } from "../packages/contracts/src/index.ts";

const catalog = learningCatalog[0];
if (!catalog) throw new Error("The tutorial catalog is empty.");
const snapshotIdentity = `sha256:${"a".repeat(64)}`;
const bundleIdentity = `sha256:${"b".repeat(64)}`;

function workflow() {
  const sourcePaths = [
    ["command-entry", "src/cli/index.ts"],
    ["governing-specification", "openspec/specs/change-creation/spec.md"],
    ["implementation", "src/commands/workflow/new-change.ts"],
    ["test", "test/cli-e2e/basic.test.ts"],
  ] as const;
  return createWorkflowExplorerProjection({
    schemaVersion: 1,
    contentIdentity: bundleIdentity,
    workflow: {
      id: catalog.workflowId,
      catalogVersion: catalog.catalogVersion,
    },
    snapshot: {
      contentIdentity: snapshotIdentity,
      repository: { id: catalog.repositoryId, headCommit: catalog.commitSha },
    },
    collectedAt: "2026-09-20T00:00:00.000Z",
    steps: sourcePaths.map(([id, path], index) => ({
      id,
      kind: "implementation",
      label: id,
      evidence: {
        type: "source",
        contentId: `sha256:${(index + 1).toString(16).repeat(64)}`,
        source: {
          repositoryId: catalog.repositoryId,
          commitSha: catalog.commitSha,
          path,
          lines: { start: 1, end: 4 },
        },
        text: `Captured ${id} evidence`,
      },
    })),
    omissions: [],
  });
}

test("matching tutorial citations resolve to pinned source excerpts", () => {
  const bundle = workflow();
  expect(findLearningCatalog(bundle)).toBe(catalog);
  expect(evaluateLearningCitations(catalog, bundle)).toEqual({
    valid: true,
    issues: [],
  });
  expect(
    catalog.steps.flatMap((step) => step.claims.map((claim) => claim.status)),
  ).toEqual(expect.arrayContaining(["fact", "quote", "inference", "unknown"]));
});

test("citation gate reports missing, wrong-path, and truncated evidence", () => {
  const bundle = workflow();
  const changed = {
    ...bundle,
    steps: bundle.steps.map((step) =>
      step.id === "command-entry" && step.evidence.type === "source"
        ? {
            ...step,
            evidence: {
              ...step.evidence,
              source: { ...step.evidence.source, path: "src/other.ts" },
            },
          }
        : step,
    ),
  };
  expect(evaluateLearningCitations(catalog, changed).valid).toBe(false);
  expect(
    evaluateLearningCitations(catalog, {
      ...bundle,
      steps: bundle.steps.filter((step) => step.id !== "test"),
    }).issues,
  ).toContain("follow-proof: test has no source evidence.");
  expect(
    evaluateLearningCitations(catalog, {
      ...bundle,
      steps: bundle.steps.map((step) =>
        step.id === "implementation" && step.evidence.type === "source"
          ? { ...step, evidence: { ...step.evidence, textTruncated: true } }
          : step,
      ),
    }).issues,
  ).toContain("follow-proof: implementation is truncated.");
});

test("unsupported revisions have no tutorial and fail the citation gate", () => {
  const bundle = {
    ...workflow(),
    snapshot: {
      ...workflow().snapshot,
      repository: {
        ...workflow().snapshot.repository,
        headCommit: "f".repeat(40),
      },
    },
  };
  expect(findLearningCatalog(bundle)).toBeUndefined();
  expect(evaluateLearningCitations(catalog, bundle).valid).toBe(false);
});
