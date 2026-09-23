import type { EvaluationCase } from "@software-journey/contracts";
import { openSpecNewChangeWorkflow } from "./workflow-catalog.js";

const source = (path: string): EvaluationCase["expectedSource"] => ({
  repositoryId: openSpecNewChangeWorkflow.repositoryId,
  commitSha: openSpecNewChangeWorkflow.commitSha,
  path,
  lines: null,
});

export const openSpecEvaluationCatalog = {
  id: "openspec-new-change-baseline",
  repositoryId: openSpecNewChangeWorkflow.repositoryId,
  commitSha: openSpecNewChangeWorkflow.commitSha,
  cases: [
    {
      id: "project-entry",
      question: "Where is the command entry point?",
      category: "command",
      expectedSource: source("src/cli/index.ts"),
    },
    {
      id: "execution-path",
      question: "Where is new change implemented?",
      category: "implementation",
      expectedSource: source("src/commands/workflow/new-change.ts"),
    },
    {
      id: "governing-spec",
      question: "Which spec governs creation?",
      category: "specification",
      expectedSource: source("openspec/specs/change-creation/spec.md"),
    },
    {
      id: "validating-test",
      question: "Which test demonstrates CLI behavior?",
      category: "test",
      expectedSource: source("test/cli-e2e/basic.test.ts"),
    },
    {
      id: "selected-history",
      question: "Which revision anchors this trail?",
      category: "history",
      expectedSource: source("src/cli/index.ts"),
    },
  ],
} as const satisfies {
  id: string;
  repositoryId: string;
  commitSha: string;
  cases: readonly EvaluationCase[];
};
