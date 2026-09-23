#!/usr/bin/env node

import {
  analyzeRepository,
  evaluateEvidence,
  RepositoryAnalysisError,
  traceWorkflow,
  writeEvaluationReport,
  writeSnapshot,
  writeWorkflowBundle,
} from "@software-journey/repository";

const args = process.argv.slice(2);

function printHelp(): void {
  console.log(`Software Journey

Usage:
  software-journey analyze --repository <path> --output <directory>
  software-journey trace --repository <path> --snapshot <file> --workflow <id> --output <directory>
  software-journey evaluate --repository <path> --snapshot <file> --bundle <file> --output <directory>

Analyze reads committed HEAD only. It never runs repository code, includes working-tree changes, or sends source content over a network.
Trace reads only the reviewed workflow catalog's committed paths. Output must be outside the selected checkout. Local artifacts record exclusions, limits, and incomplete history.`);
}

function valueAfter(flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

async function main(): Promise<void> {
  if (args.length === 0 || (args.length === 1 && args[0] === "--help")) {
    printHelp();
    return;
  }
  if (!["analyze", "trace", "evaluate"].includes(args[0] ?? "")) {
    console.error("Unknown command. Run software-journey --help.");
    process.exitCode = 1;
    return;
  }
  const repositoryPath = valueAfter("--repository");
  const outputDirectory = valueAfter("--output");
  const snapshotPath = valueAfter("--snapshot");
  const workflowId = valueAfter("--workflow");
  const bundlePath = valueAfter("--bundle");
  const isAnalyze = args[0] === "analyze";
  const isEvaluate = args[0] === "evaluate";
  if (
    !repositoryPath ||
    !outputDirectory ||
    (isAnalyze && args.length !== 5) ||
    (!isAnalyze &&
      !isEvaluate &&
      (!snapshotPath || !workflowId || args.length !== 9)) ||
    (isEvaluate && (!snapshotPath || !bundlePath || args.length !== 9))
  ) {
    console.error(
      isAnalyze
        ? "Analyze requires --repository <path> and --output <directory>."
        : isEvaluate
          ? "Evaluate requires --repository <path>, --snapshot <file>, --bundle <file>, and --output <directory>."
          : "Trace requires --repository <path>, --snapshot <file>, --workflow <id>, and --output <directory>.",
    );
    process.exitCode = 1;
    return;
  }
  try {
    if (isEvaluate) {
      if (!snapshotPath || !bundlePath) return;
      const fs = await import("node:fs/promises");
      const report = await evaluateEvidence({
        repositoryPath,
        outputDirectory,
        snapshot: JSON.parse(await fs.readFile(snapshotPath, "utf8")),
        workflow: JSON.parse(await fs.readFile(bundlePath, "utf8")),
      });
      console.log(
        `Evaluation report created: ${await writeEvaluationReport(repositoryPath, outputDirectory, report)}`,
      );
      console.log(
        `Passed: ${report.results.filter((item) => item.status === "passed").length}/${report.results.length}`,
      );
      return;
    }
    if (!isAnalyze) {
      if (!snapshotPath || !workflowId) {
        return;
      }
      const snapshotText = await (await import("node:fs/promises")).readFile(
        snapshotPath,
        "utf8",
      );
      const bundle = await traceWorkflow({
        repositoryPath,
        outputDirectory,
        snapshot: JSON.parse(snapshotText),
        workflowId,
      });
      const bundlePath = await writeWorkflowBundle(
        repositoryPath,
        outputDirectory,
        bundle,
      );
      console.log(`Workflow bundle created: ${bundlePath}`);
      console.log(`Workflow: ${bundle.workflow.id}`);
      console.log(`Steps: ${bundle.steps.length}`);
      console.log(`Omissions: ${bundle.omissions.length}`);
      return;
    }
    const snapshot = await analyzeRepository({
      repositoryPath,
      outputDirectory,
    });
    const manifestPath = await writeSnapshot(
      repositoryPath,
      outputDirectory,
      snapshot,
    );
    console.log(`Snapshot created: ${manifestPath}`);
    console.log(`Committed HEAD: ${snapshot.repository.headCommit}`);
    console.log(`Inventory entries: ${snapshot.inventory.length}`);
    console.log(`Documentation extracts: ${snapshot.documentation.length}`);
    console.log(`Omissions: ${snapshot.coverage.omissions.length}`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected analysis failure.";
    const code =
      error instanceof RepositoryAnalysisError ? ` (${error.code})` : "";
    console.error(`Analysis failed${code}: ${message}`);
    process.exitCode = 1;
  }
}

void main();
