import {
  type AnswerBenchmark,
  answerBenchmarkSchema,
} from "@software-journey/contracts";
import { openSpecNewChangeWorkflow } from "./workflow-catalog.js";

const pinned = {
  repositoryId: openSpecNewChangeWorkflow.repositoryId,
  commitSha: openSpecNewChangeWorkflow.commitSha,
};
const before = {
  repositoryId:
    "sha256:4d08f107032bcf049da0f8a1c80d884e9065978be1b2516532437b2b31443f23",
  commitSha: "62106f40e3b7b7364529a2f928717e23e37282eb",
};
const after = {
  repositoryId:
    "sha256:5ef3200b5a58e57f74865cd4cbf3ec9883fcac8ef376eda89b3d2b9f7838b038",
  commitSha: "11a9691524bad84a575854bf6dc5124f630479ba",
};
const source = (
  identity: typeof pinned,
  path: string,
  start: number,
  end: number,
) => ({ ...identity, path, lines: { start, end } });
/** Authored rubric and immutable references only; no upstream excerpts or reference-answer bodies. */
export const openSpecAnswerBenchmark: AnswerBenchmark =
  answerBenchmarkSchema.parse({
    schemaVersion: 1,
    id: "openspec-answer-quality",
    rubricVersion: "1",
    repositoryId: pinned.repositoryId,
    revisions: [pinned.commitSha, before.commitSha, after.commitSha],
    revisionIdentities: [pinned, before, after],
    cases: [
      {
        id: "project-entry",
        kind: "current",
        question:
          "Where does the CLI register new change and which handler does it call?",
        requiredPoints: [
          "Identify src/cli/index.ts",
          "Connect change <name> registration to newChangeCommand",
        ],
        permittedUncertainty:
          "Do not infer behavior inside uninspected callees",
        expectedCitations: [source(pinned, "src/cli/index.ts", 730, 748)],
      },
      {
        id: "execution-path",
        kind: "current",
        question: "How does newChangeCommand validate and create a change?",
        requiredPoints: [
          "Name validation precedes root selection",
          "Explicit schema is validated and createChange receives the resolved root and changesDir",
          "Describe JSON output without claiming uninspected utility behavior",
        ],
        permittedUncertainty:
          "createChange internals are outside this captured selection",
        expectedCitations: [
          source(pinned, "src/commands/workflow/new-change.ts", 116, 158),
          source(pinned, "src/commands/workflow/new-change.ts", 167, 179),
        ],
      },
      {
        id: "governing-spec",
        kind: "current",
        question:
          "Which captured specification defines change creation and rejection cases?",
        requiredPoints: [
          "Identify change-creation spec",
          "Explain creation, duplicate rejection, and invalid-name rejection",
          "Distinguish normative requirements from observed runtime behavior",
        ],
        permittedUncertainty:
          "A specification alone does not prove implementation or test success",
        expectedCitations: [
          source(pinned, "openspec/specs/change-creation/spec.md", 6, 23),
        ],
      },
      {
        id: "validating-test",
        kind: "current",
        question:
          "What do the captured basic CLI tests assert, and do they establish new-change correctness?",
        requiredPoints: [
          "Identify basic.test.ts help-output and version assertions",
          "Describe exit-code and output expectations",
          "Do not claim these assertions validate new-change implementation or that imported tests were run",
        ],
        permittedUncertainty:
          "Only inspected assertions are known; no upstream test execution occurs",
        expectedCitations: [
          source(pinned, "test/cli-e2e/basic.test.ts", 75, 103),
        ],
      },
      {
        id: "behavior-change",
        kind: "history",
        question:
          "How did task progress handling for unfamiliar checkbox markers change across the reviewed commit?",
        requiredPoints: [
          "Before: strict marker pattern drops unfamiliar markers from totals",
          "After: supported unfamiliar markers count as unfinished; only x/X with padding counts as done",
          "Identify a regression assertion and distinguish commit claims from source evidence",
        ],
        permittedUncertainty:
          "The current snapshot/trace pipeline does not capture these historical code/test paths. Report unavailable evidence instead of guessing.",
        expectedCitations: [
          source(before, "src/utils/task-progress.ts", 26, 51),
          source(after, "src/utils/task-progress.ts", 55, 80),
          source(after, "test/utils/task-progress.test.ts", 359, 382),
        ],
      },
    ],
  });
