import {
  lessonCatalog,
  lessonTarget,
} from "../../packages/knowledge/src/lesson.ts";
import { evidenceFixture, required } from "./retrieval.ts";
export function lessonFixture() {
  const { snapshot, bundle } = evidenceFixture(
    "Synthetic evidence\nSecond line",
  );
  snapshot.repository = {
    id: lessonTarget.repositoryId,
    headCommit: lessonTarget.commitSha,
  };
  for (const doc of snapshot.documentation) {
    doc.source.repositoryId = lessonTarget.repositoryId;
    doc.source.commitSha = lessonTarget.commitSha;
  }
  bundle.snapshot.repository = snapshot.repository;
  bundle.workflow.id = lessonTarget.workflowId;
  bundle.steps = lessonCatalog.map((item) => ({
    id: item.id,
    kind: item.kind,
    label: item.title,
    evidence:
      item.kind === "history"
        ? {
            type: "history",
            commit: {
              ...required(snapshot.history[0]),
              sha: lessonTarget.commitSha,
            },
          }
        : {
            type: "source",
            ...required(snapshot.documentation[0]),
            source: {
              ...required(snapshot.documentation[0]).source,
              path: item.path ?? "",
            },
          },
  }));
  return { snapshot, bundle };
}
