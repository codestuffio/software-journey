import { readJourneyPlanEvidence } from "@software-journey/repository";

export const journeyBudget = {
  model: "claude-haiku-5-5",
  inputTokensPerUpdate: 8192,
  outputTokensPerUpdate: 2000,
  inputUsdPerMillion: 0.1,
  outputUsdPerMillion: 0.5,
};

export async function runJourneyPlanCommand(args: string[]) {
  const [
    repositoryFlag,
    repository,
    baselineFlag,
    baseline,
    targetFlag,
    target,
  ] = args;
  if (
    args.length !== 6 ||
    repositoryFlag !== "--repository" ||
    !repository ||
    baselineFlag !== "--baseline" ||
    !baseline ||
    targetFlag !== "--target" ||
    !target
  )
    throw new Error(
      "Use plan-walkthrough --repository <path> --baseline <sha> --target <sha>.",
    );

  const evidence = await readJourneyPlanEvidence(repository, baseline, target);
  const { decisions, previous, removed } = chapterDecisions(evidence);

  const updates = decisions.filter(({ status }) => status === "Update").length;
  const reuse = decisions.filter(
    ({ status }) => status === "Reuse candidate",
  ).length;
  const input = updates * journeyBudget.inputTokensPerUpdate;
  const output = updates * journeyBudget.outputTokensPerUpdate;
  const cost =
    (input * journeyBudget.inputUsdPerMillion +
      output * journeyBudget.outputUsdPerMillion) /
    1_000_000;
  console.log(
    [
      "## Incremental walkthrough plan",
      "",
      `Baseline commit \`${evidence.baseline}\``,
      `Proposed commit \`${evidence.target}\``,
      "",
      `**Reuse candidates (${reuse}) · Updates (${updates}) · Removals (${removed})**`,
      ...(previous
        ? []
        : [
            "",
            "The baseline has no chapter catalog. All proposed chapters need an initial update.",
          ]),
      "",
      "| Chapter | Decision | Evidence |",
      "| --- | --- | --- |",
      ...decisions.map(
        ({ title, status, reason }) => `| ${title} | ${status} | ${reason} |`,
      ),
      "",
      `Estimated generation budget for \`${journeyBudget.model}\` is **${input} input tokens + ${output} output tokens · $${cost.toFixed(5)} USD**.`,
      "",
      `The estimate uses an allowance of ${journeyBudget.inputTokensPerUpdate.toLocaleString("en-US")} input and ${journeyBudget.outputTokensPerUpdate.toLocaleString("en-US")} output tokens per update at $${journeyBudget.inputUsdPerMillion.toFixed(2)} and $${journeyBudget.outputUsdPerMillion.toFixed(2)} per million tokens, respectively. This plan consumed zero model tokens.`,
      "",
      "Coverage is limited to declared Git paths. Reuse candidates still need an available chapter output and citation validation before publication.",
    ].join("\n"),
  );
}

export function chapterDecisions(
  evidence: Awaited<ReturnType<typeof readJourneyPlanEvidence>>,
) {
  const { previous, proposed, before, after } = evidence;
  const priorChapters = new Map(
    previous?.chapters.map((chapter) => [chapter.id, chapter]),
  );
  const decisions = proposed.chapters.map((chapter) => {
    const id = chapter.id;
    const prior = priorChapters.get(chapter.id);
    priorChapters.delete(chapter.id);
    const changed = chapter.paths.filter((path) => {
      const old = before.get(path);
      const current = after.get(path);
      return (
        !old || !current || old.mode !== current.mode || old.oid !== current.oid
      );
    });
    if (!prior)
      return {
        id,
        title: chapter.title,
        status: "Update",
        reason: "New chapter",
      };
    if (
      prior.title !== chapter.title ||
      prior.paths.length !== chapter.paths.length ||
      chapter.paths.some((path, index) => path !== prior.paths[index])
    )
      return {
        id,
        title: chapter.title,
        status: "Update",
        reason: "Chapter definition changed",
      };
    if (changed.length)
      return {
        id,
        title: chapter.title,
        status: "Update",
        reason: `Changed or unavailable evidence in ${changed.map((path) => `\`${path}\``).join(", ")}`,
      };
    return {
      id,
      title: chapter.title,
      status: "Reuse candidate",
      reason: "Declared evidence is unchanged",
    };
  });
  for (const chapter of priorChapters.values()) {
    decisions.push({
      id: chapter.id,
      title: chapter.title,
      status: "Remove",
      reason: "Chapter was removed from the catalog",
    });
  }

  return { decisions, previous, removed: priorChapters.size };
}
