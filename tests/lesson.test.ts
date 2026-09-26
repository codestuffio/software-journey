import { expect, test } from "vitest";
import {
  buildGuidedLesson,
  lessonCatalog,
} from "../packages/knowledge/src/lesson.ts";
import { lessonFixture } from "./fixtures/lesson.ts";
import { required } from "./fixtures/retrieval.ts";

test("lesson preserves five reviewed evidence roles and separates guidance", async () => {
  const { snapshot, bundle } = lessonFixture();
  const lesson = await buildGuidedLesson(snapshot, bundle);
  expect(lesson.steps.map((x) => x.id)).toEqual(lessonCatalog.map((x) => x.id));
  expect(lesson.steps.every((x) => x.ready)).toBe(true);
  for (const step of lesson.steps) {
    expect(step.guidance).not.toContain("Synthetic evidence");
    expect(step.evidence.inputs.snapshot).toBe(snapshot.contentIdentity);
  }
});
test("unsupported identities and substituted evidence are rejected", async () => {
  const { snapshot, bundle } = lessonFixture();
  bundle.workflow.id = "other";
  await expect(buildGuidedLesson(snapshot, bundle)).rejects.toThrow(
    "No authored",
  );
  bundle.workflow.id = "openspec-new-change";
  const first = required(bundle.steps[0]);
  if (first.evidence.type === "source") first.evidence.source.path = "wrong.ts";
  await expect(buildGuidedLesson(snapshot, bundle)).rejects.toThrow("catalog");
});
test("missing or truncated evidence prevents checkpoints while global history limitations remain visible", async () => {
  const { snapshot, bundle } = lessonFixture();
  bundle.steps.splice(0, 1);
  snapshot.coverage.history.completeness = "limited";
  let lesson = await buildGuidedLesson(snapshot, bundle);
  expect(lesson.steps[0]?.ready).toBe(false);
  expect(lesson.steps[4]?.ready).toBe(true);
  expect(lesson.steps[4]?.evidence.reasons).toContain("collection-limited");
  const item = required(bundle.steps[0]);
  if (item.evidence.type === "source") {
    item.evidence.text = "long line".repeat(10000);
    item.evidence.source.lines = { start: 1, end: 1 };
  }
  lesson = await buildGuidedLesson(snapshot, bundle);
  expect(lesson.steps[1]?.ready).toBe(false);
  await expect(
    buildGuidedLesson(snapshot, bundle, AbortSignal.abort()),
  ).rejects.toThrow();
});
