import type { WorkflowExplorerProjection } from "@software-journey/contracts";

export type LearningClaim =
  | {
      status: "fact" | "inference";
      text: string;
      evidenceStepId: string;
      sourcePath: string;
    }
  | { status: "quote"; evidenceStepId: string; sourcePath: string }
  | { status: "unknown"; text: string };

export interface LearningStep {
  id: string;
  title: string;
  prompt: string;
  claims: readonly LearningClaim[];
}

export interface LearningCatalogEntry {
  workflowId: string;
  catalogVersion: string;
  repositoryId: string;
  commitSha: string;
  steps: readonly LearningStep[];
}

export const learningCatalog: readonly LearningCatalogEntry[] = [
  {
    workflowId: "openspec-new-change",
    catalogVersion: "1",
    repositoryId:
      "sha256:eee892b5859866adf340033826fac3acb4ab68c1ed787676a313a00e8ac5d325",
    commitSha: "bae58cf61479986431bb798acbe5a688a591c18c",
    steps: [
      {
        id: "find-command",
        title: "Find the command entry",
        prompt: "Where does this recorded workflow enter the CLI?",
        claims: [
          {
            status: "fact",
            text: "The captured command entry comes from src/cli/index.ts.",
            evidenceStepId: "command-entry",
            sourcePath: "src/cli/index.ts",
          },
          {
            status: "inference",
            text: "This is a useful starting point for following the command into its implementation.",
            evidenceStepId: "command-entry",
            sourcePath: "src/cli/index.ts",
          },
        ],
      },
      {
        id: "read-contract",
        title: "Read the governing specification",
        prompt: "What behavior does the repository document?",
        claims: [
          {
            status: "quote",
            evidenceStepId: "governing-specification",
            sourcePath: "openspec/specs/change-creation/spec.md",
          },
          {
            status: "unknown",
            text: "A specification excerpt alone does not establish that every implementation path conforms to it.",
          },
        ],
      },
      {
        id: "follow-proof",
        title: "Compare implementation and test",
        prompt:
          "Which recorded files should you inspect before changing the behavior?",
        claims: [
          {
            status: "fact",
            text: "The trail captures src/commands/workflow/new-change.ts as implementation evidence.",
            evidenceStepId: "implementation",
            sourcePath: "src/commands/workflow/new-change.ts",
          },
          {
            status: "fact",
            text: "The trail captures test/cli-e2e/basic.test.ts as test evidence.",
            evidenceStepId: "test",
            sourcePath: "test/cli-e2e/basic.test.ts",
          },
          {
            status: "unknown",
            text: "The captured test excerpt does not establish complete test coverage.",
          },
        ],
      },
    ],
  },
];

export interface CitationCheck {
  valid: boolean;
  issues: string[];
}

type SourceEvidence = Extract<
  WorkflowExplorerProjection["steps"][number]["evidence"],
  { type: "source" }
>;

export function resolveLearningCitation(
  claim: Exclude<LearningClaim, { status: "unknown" }>,
  catalog: LearningCatalogEntry,
  bundle: WorkflowExplorerProjection,
):
  | { evidence: SourceEvidence; issue: null }
  | { evidence: null; issue: string } {
  const evidence = bundle.steps.find(
    (item) => item.id === claim.evidenceStepId,
  )?.evidence;
  if (evidence?.type !== "source") {
    return {
      evidence: null,
      issue: `${claim.evidenceStepId} has no source evidence.`,
    };
  }
  if (
    evidence.source.repositoryId !== catalog.repositoryId ||
    evidence.source.commitSha !== catalog.commitSha ||
    evidence.source.path !== claim.sourcePath ||
    !evidence.source.lines
  ) {
    return {
      evidence: null,
      issue: `${claim.evidenceStepId} has an invalid citation.`,
    };
  }
  if ("textTruncated" in evidence && evidence.textTruncated) {
    return { evidence: null, issue: `${claim.evidenceStepId} is truncated.` };
  }
  return { evidence, issue: null };
}

/** R4 baseline: checks citation identity and availability, not semantic truth. */
export function evaluateLearningCitations(
  catalog: LearningCatalogEntry,
  bundle: WorkflowExplorerProjection,
): CitationCheck {
  const issues: string[] = [];
  if (
    bundle.workflow.id !== catalog.workflowId ||
    bundle.workflow.catalogVersion !== catalog.catalogVersion ||
    bundle.snapshot.repository.id !== catalog.repositoryId ||
    bundle.snapshot.repository.headCommit !== catalog.commitSha
  ) {
    issues.push("Tutorial catalog does not match the workflow snapshot.");
  }
  for (const step of catalog.steps) {
    for (const claim of step.claims) {
      if (claim.status === "unknown") continue;
      const result = resolveLearningCitation(claim, catalog, bundle);
      if (result.issue) issues.push(`${step.id}: ${result.issue}`);
    }
  }
  return { valid: issues.length === 0, issues };
}

export function findLearningCatalog(
  bundle: WorkflowExplorerProjection,
): LearningCatalogEntry | undefined {
  return learningCatalog.find(
    (entry) =>
      entry.workflowId === bundle.workflow.id &&
      entry.catalogVersion === bundle.workflow.catalogVersion &&
      entry.repositoryId === bundle.snapshot.repository.id &&
      entry.commitSha === bundle.snapshot.repository.headCommit,
  );
}
