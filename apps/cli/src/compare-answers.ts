import { answerEvaluationLimits } from "@software-journey/contracts";
import { compareAnswers } from "@software-journey/knowledge";
import {
  loadAnswerComparisonInputs,
  writeAnswerComparisonReport,
} from "@software-journey/repository";

export async function runCompareAnswersCommand(args: string[]) {
  const controller = new AbortController();
  const cancel = () => controller.abort(new Error("Comparison canceled"));
  const signal = AbortSignal.any([
    controller.signal,
    AbortSignal.timeout(answerEvaluationLimits.deadlineMs),
  ]);
  process.once("SIGINT", cancel);
  process.once("SIGTERM", cancel);
  try {
    const allowed = [
      "--benchmark",
      "--trials",
      "--assessments",
      "--evidence",
      "--output",
    ];
    if (args.length === 2 && args[1] === "--help") {
      console.log(
        "Usage: software-journey compare-answers --benchmark <file> --trials <file> --assessments <file> --evidence <manifest-file> --output <new-directory>\nOffline report assembly only; no Git, model request, or network access. Inputs: 1 MiB each; evidence: 32 MiB each, 128 MiB total; report: 4 MiB; 20 cases, 100 trials; 10-second deadline. Output must be outside Git checkouts. Human assessments and metric provenance are supplied explicitly.",
      );
      return;
    }
    const flags = new Map<string, string>();
    for (let i = 1; i < args.length; i += 2) {
      const flag = args[i],
        value = args[i + 1];
      if (
        !flag ||
        !allowed.includes(flag) ||
        flags.has(flag) ||
        !value ||
        value.startsWith("--")
      )
        throw new Error("Invalid, duplicate, or missing argument");
      flags.set(flag, value);
    }
    if (allowed.some((flag) => !flags.has(flag)))
      throw new Error(
        "Requires --benchmark, --trials, --assessments, --evidence, and --output",
      );
    const inputs = await loadAnswerComparisonInputs(
      {
        benchmark: flags.get("--benchmark") ?? "",
        trials: flags.get("--trials") ?? "",
        assessments: flags.get("--assessments") ?? "",
        evidence: flags.get("--evidence") ?? "",
      },
      signal,
    );
    const report = await compareAnswers(
      inputs.benchmark,
      inputs.trials,
      inputs.assessments,
      inputs.evidence,
      signal,
    );
    const path = await writeAnswerComparisonReport(
      flags.get("--output") ?? "",
      report,
      signal,
    );
    console.log(`Comparison report created: ${path}`);
    console.log(
      `Matched pairs: ${report.counts.pairs}; real quality-passing pairs: ${report.counts.eligiblePairs}; unpaired trials: ${report.counts.unpairedTrials}`,
    );
  } catch (error) {
    console.error(
      `Answer comparison failed: ${(error instanceof Error ? error.message : "Unknown error").slice(0, 512)}`,
    );
    process.exitCode = 1;
  } finally {
    process.removeListener("SIGINT", cancel);
    process.removeListener("SIGTERM", cancel);
  }
}
