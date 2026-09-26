import {
  type GuidedLesson,
  guidedLessonSchema,
  validateRetrievalInputs,
} from "@software-journey/contracts";
import { retrieveEvidence } from "./index.js";

export const lessonTarget = {
  repositoryId:
    "sha256:eee892b5859866adf340033826fac3acb4ab68c1ed787676a313a00e8ac5d325",
  commitSha: "bae58cf61479986431bb798acbe5a688a591c18c",
  workflowId: "openspec-new-change",
} as const;
export const lessonCatalog = [
  {
    id: "command-entry",
    kind: "command",
    path: "src/cli/index.ts",
    title: "Find the command entry",
    guidance:
      "Start at the command entry selected by this reviewed trail. Locate the new-change command registration, then look for the implementation it invokes. A command entry helps you find the boundary between user input and application behavior.",
    question: "What should you look for in the command entry?",
    choices: [
      "A guarantee that every behavior works",
      "Registration and dispatch of the command",
      "The complete history of the repository",
    ],
    correctIndex: 1,
    feedback:
      "The entry point connects a command name and its options to the code it invokes. Tests and history answer different questions.",
  },
  {
    id: "governing-specification",
    kind: "specification",
    path: "openspec/specs/change-creation/spec.md",
    title: "Read the behavior contract",
    guidance:
      "Read the captured requirements and scenarios before proposing a change. Separate the behavior the specification promises from the implementation that currently provides it. Documentation is a claim to check against code and tests.",
    question: "What does a specification provide?",
    choices: [
      "The stated behavior and scenarios",
      "Proof that all scenarios pass",
      "A reason to skip implementation review",
    ],
    correctIndex: 0,
    feedback:
      "Requirements describe intended behavior. Compare them with implementation and tests before treating that intent as demonstrated behavior.",
  },
  {
    id: "implementation",
    kind: "implementation",
    path: "src/commands/workflow/new-change.ts",
    title: "Trace the implementation",
    guidance:
      "Follow the function called by the command entry. Identify its inputs, validation, and effects in the captured code. If a helper is outside the excerpt, record that as an unknown instead of guessing what it does.",
    question: "How should you handle a helper missing from the evidence?",
    choices: [
      "Assume it is safe",
      "Treat its name as proof of behavior",
      "Record the gap and inspect its source before changing it",
    ],
    correctIndex: 2,
    feedback:
      "A reference to a helper does not establish its behavior. Keep the gap explicit and inspect the helper at the same revision.",
  },
  {
    id: "test",
    kind: "test",
    path: "test/cli-e2e/basic.test.ts",
    title: "Find a testable first change",
    guidance:
      "Inspect the selected test file for the behavior it exercises and the assertions it makes. Match a proposed behavior change to an existing scenario or describe the missing test you would add. Captured test code is not a test-run result.",
    question: "What does captured test code establish?",
    choices: [
      "That the tests passed on your machine",
      "The assertions and setup recorded in the test",
      "That untested paths are correct",
    ],
    correctIndex: 1,
    feedback:
      "The excerpt shows test intent and assertions. Running the appropriate tests is a separate validation step.",
  },
  {
    id: "selected-history",
    kind: "history",
    path: null,
    title: "Anchor your plan to a revision",
    guidance:
      "The recorded commit anchors this trail to a specific repository state. Check the history coverage before discussing earlier behavior. A commit subject is an author claim, and one revision record does not explain how a behavior changed.",
    question: "What can this revision record support?",
    choices: [
      "Which revision this trail records",
      "Why every design decision was made",
      "A complete account of behavior changes",
    ],
    correctIndex: 0,
    feedback:
      "Use the commit as an immutable reference. A historical explanation needs additional evidence and must disclose missing history.",
  },
] as const;

export async function buildGuidedLesson(
  snapshotValue: unknown,
  bundleValue: unknown,
  externalSignal?: AbortSignal,
): Promise<GuidedLesson> {
  const signal = externalSignal
    ? AbortSignal.any([externalSignal, AbortSignal.timeout(10000)])
    : AbortSignal.timeout(10000);
  const inputs = await validateRetrievalInputs(
    snapshotValue,
    bundleValue,
    signal,
  );
  const { snapshot, bundle } = inputs;
  if (
    !bundle ||
    snapshot.repository.id !== lessonTarget.repositoryId ||
    snapshot.repository.headCommit !== lessonTarget.commitSha ||
    bundle.workflow.id !== lessonTarget.workflowId ||
    bundle.workflow.catalogVersion !== "1"
  ) {
    throw new Error(
      "No authored lesson is available for this workflow revision.",
    );
  }
  const steps: GuidedLesson["steps"] = [];
  for (const authored of lessonCatalog) {
    const actual = bundle.steps.find((step) => step.id === authored.id);
    if (
      actual &&
      (actual.kind !== authored.kind ||
        (actual.evidence.type === "source" &&
          actual.evidence.source.path !== authored.path) ||
        (actual.evidence.type === "history" && authored.kind !== "history") ||
        (authored.kind === "history" && actual.evidence.type === "source"))
    ) {
      throw new Error("Lesson evidence does not match its reviewed catalog.");
    }
    const evidence = await retrieveEvidence(
      inputs,
      {
        schemaVersion: 1,
        maxBytes: 32768,
        selector: {
          type: "step",
          workflowId: lessonTarget.workflowId,
          stepId: authored.id,
        },
      },
      signal,
    );
    const item = evidence.items[0];
    const ready =
      !!item &&
      item.type !== "unavailable" &&
      item.status === "available" &&
      evidence.budget.omittedItems === 0 &&
      evidence.budget.omittedLines === 0;
    steps.push({
      id: authored.id,
      title: authored.title,
      guidance: authored.guidance,
      question: authored.question,
      choices: [...authored.choices],
      correctIndex: authored.correctIndex,
      feedback: authored.feedback,
      evidence,
      ready,
    });
  }
  signal.throwIfAborted();
  return guidedLessonSchema.parse({
    schemaVersion: 1,
    catalogVersion: "1",
    title: "Your first OpenSpec change",
    snapshotIdentity: snapshot.contentIdentity,
    bundleIdentity: bundle.contentIdentity,
    steps,
  });
}
