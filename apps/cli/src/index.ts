#!/usr/bin/env node

import {
  analyzeRepository,
  RepositoryAnalysisError,
  writeSnapshot,
} from "@software-journey/repository";

const args = process.argv.slice(2);

function printHelp(): void {
  console.log(`Software Journey

Usage: software-journey analyze --repository <path> --output <directory>

Analyze reads committed HEAD only. It never runs repository code, includes working-tree changes, or sends source content over a network.
Output must be outside the selected checkout. The snapshot records exclusions, limits, and incomplete history.`);
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
  if (args[0] !== "analyze") {
    console.error("Unknown command. Run software-journey --help.");
    process.exitCode = 1;
    return;
  }
  const repositoryPath = valueAfter("--repository");
  const outputDirectory = valueAfter("--output");
  if (!repositoryPath || !outputDirectory || args.length !== 5) {
    console.error(
      "Analyze requires --repository <path> and --output <directory>.",
    );
    process.exitCode = 1;
    return;
  }
  try {
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
