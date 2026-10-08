import { constants as fileSystemConstants } from "node:fs";
import {
  access,
  mkdir,
  mkdtemp,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

import {
  type CommitMetadata,
  type DocumentationExtract,
  type EvaluationReport,
  type InventoryEntry,
  type Omission,
  type Snapshot,
  validateEvaluationReportForWrite,
  validateSnapshotForWrite,
  validateWorkflowBundleForWrite,
  type WorkflowBundle,
} from "@software-journey/contracts";
import {
  contentIdentity,
  gitText,
  gitTimeoutMs,
  isSafetyExcluded,
  RepositoryAnalysisError,
  runGit,
  safelyDecodePath,
} from "./git.js";

export { RepositoryAnalysisError } from "./git.js";
export {
  type CaptureSourcesOptions,
  captureSources,
  captureSourcesToDirectory,
} from "./source-capture.js";

import { openSpecEvaluationCatalog } from "./evaluation-catalog.js";
import { findWorkflowCatalogEntry } from "./workflow-catalog.js";

export const snapshotLimits = {
  inventoryEntries: 10_000,
  documentBytes: 512 * 1024,
  totalDocumentBytes: 20 * 1024 * 1024,
  commits: 200,
  timeoutMs: gitTimeoutMs,
} as const;

export interface AnalyzeRepositoryOptions {
  repositoryPath: string;
  outputDirectory: string;
  signal?: AbortSignal;
}

export interface TraceWorkflowOptions {
  repositoryPath: string;
  outputDirectory: string;
  snapshot: unknown;
  workflowId: string;
  signal?: AbortSignal;
}
export interface EvaluateEvidenceOptions {
  repositoryPath: string;
  outputDirectory: string;
  snapshot: unknown;
  workflow: unknown;
  signal?: AbortSignal;
}

function isDocumentationPath(path: string): boolean {
  const name = path.toLowerCase();
  return name === "readme" || name.endsWith(".md") || name.endsWith(".mdx");
}

function outputIsInsideRepository(
  repositoryPath: string,
  outputDirectory: string,
): boolean {
  const relation = relative(repositoryPath, outputDirectory);
  return (
    relation === "" || (relation !== ".." && !relation.startsWith(`..${"/"}`))
  );
}

async function assertUsableCheckout(
  repositoryPath: string,
  outputDirectory: string,
  signal?: AbortSignal,
): Promise<{ repositoryPath: string; headCommit: string; shallow: boolean }> {
  const resolvedRepository = resolve(repositoryPath);
  const resolvedOutput = resolve(outputDirectory);
  try {
    await access(resolvedRepository, fileSystemConstants.R_OK);
  } catch {
    throw new RepositoryAnalysisError(
      "Repository path is not readable.",
      "invalid-path",
    );
  }
  if (outputIsInsideRepository(resolvedRepository, resolvedOutput)) {
    throw new RepositoryAnalysisError(
      "Output directory must be outside the target repository.",
      "output-inside-repository",
    );
  }
  const isRepository = await gitText(
    resolvedRepository,
    ["rev-parse", "--is-inside-work-tree"],
    signal,
  );
  if (isRepository !== "true") {
    throw new RepositoryAnalysisError(
      "Path is not a Git working tree.",
      "not-repository",
    );
  }
  let headCommit: string;
  try {
    headCommit = await gitText(
      resolvedRepository,
      ["rev-parse", "--verify", "HEAD"],
      signal,
    );
  } catch (error) {
    if (
      error instanceof RepositoryAnalysisError &&
      error.code === "git-failed"
    ) {
      throw new RepositoryAnalysisError(
        "Repository has no committed HEAD.",
        "no-commits",
      );
    }
    throw error;
  }
  const shallow =
    (await gitText(
      resolvedRepository,
      ["rev-parse", "--is-shallow-repository"],
      signal,
    )) === "true";
  return { repositoryPath: resolvedRepository, headCommit, shallow };
}

async function collectInventory(
  repositoryPath: string,
  signal?: AbortSignal,
): Promise<{ entries: InventoryEntry[]; omissions: Omission[] }> {
  const result = await runGit(
    repositoryPath,
    ["ls-tree", "-rz", "HEAD"],
    signal,
  );
  const entries: InventoryEntry[] = [];
  const omissions: Omission[] = [];
  for (const record of result.stdout
    .subarray()
    .toString("binary")
    .split("\0")) {
    if (!record) continue;
    const tabIndex = record.indexOf("\t");
    const descriptor = record.slice(0, tabIndex).split(" ");
    const rawPath = Buffer.from(record.slice(tabIndex + 1), "binary");
    const decodedPath = safelyDecodePath(rawPath);
    if (!decodedPath.path) {
      omissions.push({
        reason: decodedPath.reason,
        path: null,
        detail: "Git path could not be safely decoded.",
      });
      continue;
    }
    const path = decodedPath.path;
    const [mode, type, objectId] = descriptor;
    if (mode === "120000") {
      omissions.push({
        reason: "symlink",
        path,
        detail: "Symlink content is not read.",
      });
      continue;
    }
    if (mode === "160000" || type === "commit") {
      omissions.push({
        reason: "submodule",
        path,
        detail: "Submodule content is not read.",
      });
      continue;
    }
    if (isSafetyExcluded(path)) {
      omissions.push({
        reason: "default-exclusion",
        path,
        detail: "Path matches a built-in safety exclusion.",
      });
      continue;
    }
    if (entries.length >= snapshotLimits.inventoryEntries) {
      omissions.push({
        reason: "inventory-limit",
        path,
        detail: "Inventory entry limit reached.",
      });
      break;
    }
    if (type === "blob" && objectId) {
      entries.push({
        path,
        objectId,
        mode: mode === "100755" ? "executable" : "file",
      });
    }
  }
  return { entries, omissions };
}

async function collectDocumentation(
  repositoryPath: string,
  repositoryId: string,
  headCommit: string,
  inventory: InventoryEntry[],
  priorOmissions: Omission[],
  signal?: AbortSignal,
): Promise<{
  extracts: DocumentationExtract[];
  omissions: Omission[];
  extractedBytes: number;
  eligibleFiles: number;
}> {
  const omissions = [...priorOmissions];
  const extracts: DocumentationExtract[] = [];
  let extractedBytes = 0;
  let eligibleFiles = 0;
  for (const entry of inventory) {
    if (!isDocumentationPath(entry.path)) continue;
    eligibleFiles++;
    const blob = await runGit(
      repositoryPath,
      ["cat-file", "blob", entry.objectId],
      signal,
      snapshotLimits.documentBytes,
    );
    if (blob.exceededLimit) {
      omissions.push({
        reason: "per-file-byte-limit",
        path: entry.path,
        detail: "Documentation file exceeds the per-file byte limit.",
      });
      continue;
    }
    if (blob.stdout.includes(0)) {
      omissions.push({
        reason: "binary",
        path: entry.path,
        detail: "Documentation candidate contains a NUL byte.",
      });
      continue;
    }
    if (
      extractedBytes + blob.stdout.length >
      snapshotLimits.totalDocumentBytes
    ) {
      omissions.push({
        reason: "total-byte-limit",
        path: entry.path,
        detail: "Total documentation byte limit reached.",
      });
      break;
    }
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(blob.stdout);
    } catch (error) {
      if (
        error instanceof RepositoryAnalysisError &&
        error.code === "canceled"
      ) {
        throw error;
      }
      omissions.push({
        reason: "binary",
        path: entry.path,
        detail: "Documentation candidate is not UTF-8 text.",
      });
      continue;
    }
    if (!text) continue;
    extractedBytes += blob.stdout.length;
    const source = {
      repositoryId,
      commitSha: headCommit,
      path: entry.path,
      lines: { start: 1, end: text.split("\n").length },
    };
    extracts.push({
      contentId: contentIdentity({ source, text }),
      source,
      text,
    });
  }
  return { extracts, omissions, extractedBytes, eligibleFiles };
}

async function collectHistory(
  repositoryPath: string,
  shallow: boolean,
  signal?: AbortSignal,
): Promise<{
  commits: CommitMetadata[];
  completeness: "complete" | "shallow" | "limited" | "unavailable";
}> {
  const result = await runGit(
    repositoryPath,
    [
      "log",
      `-n${snapshotLimits.commits}`,
      "--format=%H%x00%P%x00%aI%x00%s%x00",
      "-z",
      "HEAD",
    ],
    signal,
  );
  const values = result.stdout.toString("utf8").split("\0").filter(Boolean);
  const commits: CommitMetadata[] = [];
  for (let index = 0; index + 3 < values.length; index += 4) {
    const sha = values[index];
    const parents = values[index + 1];
    const authoredAt = values[index + 2];
    const subject = values[index + 3];
    if (!sha || parents === undefined || !authoredAt || subject === undefined)
      continue;
    commits.push({
      sha,
      parentShas: parents ? parents.split(" ") : [],
      authoredAt,
      subject,
    });
  }
  return {
    commits,
    completeness: shallow
      ? "shallow"
      : commits.length === snapshotLimits.commits
        ? "limited"
        : "complete",
  };
}

async function collectWorkingTreeOmissions(
  repositoryPath: string,
  signal?: AbortSignal,
): Promise<Omission[]> {
  const result = await runGit(
    repositoryPath,
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    signal,
  );
  const omissions: Omission[] = [];
  for (const record of result.stdout.toString("binary").split("\0")) {
    if (!record || record.length < 4) continue;
    const path = safelyDecodePath(Buffer.from(record.slice(3), "binary")).path;
    omissions.push({
      reason: record.startsWith("??") ? "untracked-worktree" : "dirty-worktree",
      path,
      detail: "Working-tree content is excluded from committed-HEAD analysis.",
    });
  }
  return omissions;
}

export async function analyzeRepository(
  options: AnalyzeRepositoryOptions,
): Promise<Snapshot> {
  const startedAt = new Date().toISOString();
  const checkout = await assertUsableCheckout(
    options.repositoryPath,
    options.outputDirectory,
    options.signal,
  );
  const treeId = await gitText(
    checkout.repositoryPath,
    ["rev-parse", "HEAD^{tree}"],
    options.signal,
  );
  const repositoryId = contentIdentity({
    headCommit: checkout.headCommit,
    treeId,
  });
  const { entries, omissions: inventoryOmissions } = await collectInventory(
    checkout.repositoryPath,
    options.signal,
  );
  const documentation = await collectDocumentation(
    checkout.repositoryPath,
    repositoryId,
    checkout.headCommit,
    entries,
    inventoryOmissions,
    options.signal,
  );
  const history = await collectHistory(
    checkout.repositoryPath,
    checkout.shallow,
    options.signal,
  );
  const workingTreeOmissions = await collectWorkingTreeOmissions(
    checkout.repositoryPath,
    options.signal,
  );
  const completedAt = new Date().toISOString();
  const snapshot = {
    schemaVersion: 1 as const,
    contentIdentity: contentIdentity({
      repository: { id: repositoryId, headCommit: checkout.headCommit },
      inventory: entries,
      documentation: documentation.extracts,
      history: history.commits,
      coverage: {
        inventory: {
          discoveredEntries: entries.length + inventoryOmissions.length,
          recordedEntries: entries.length,
        },
        documentation: {
          eligibleFiles: documentation.eligibleFiles,
          extractedFiles: documentation.extracts.length,
          extractedBytes: documentation.extractedBytes,
        },
        history: {
          requestedCommits: snapshotLimits.commits,
          recordedCommits: history.commits.length,
          completeness: history.completeness,
        },
        omissions: [...documentation.omissions, ...workingTreeOmissions],
      },
    }),
    repository: { id: repositoryId, headCommit: checkout.headCommit },
    inventory: entries,
    documentation: documentation.extracts,
    history: history.commits,
    coverage: {
      inventory: {
        discoveredEntries: entries.length + inventoryOmissions.length,
        recordedEntries: entries.length,
      },
      documentation: {
        eligibleFiles: documentation.eligibleFiles,
        extractedFiles: documentation.extracts.length,
        extractedBytes: documentation.extractedBytes,
      },
      history: {
        requestedCommits: snapshotLimits.commits,
        recordedCommits: history.commits.length,
        completeness: history.completeness,
      },
      omissions: [...documentation.omissions, ...workingTreeOmissions],
    },
    run: {
      analyzerVersion: "0.0.0",
      startedAt,
      completedAt,
      durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
    },
  };
  return validateSnapshotForWrite(snapshot);
}

export async function writeSnapshot(
  repositoryPath: string,
  outputDirectory: string,
  snapshot: unknown,
): Promise<string> {
  const validated = validateSnapshotForWrite(snapshot);
  const resolvedRepository = resolve(repositoryPath);
  const resolvedOutput = resolve(outputDirectory);
  if (outputIsInsideRepository(resolvedRepository, resolvedOutput)) {
    throw new RepositoryAnalysisError(
      "Output directory must be outside the target repository.",
      "output-inside-repository",
    );
  }
  try {
    await access(resolvedOutput);
    throw new RepositoryAnalysisError(
      "Output directory already exists.",
      "output-exists",
    );
  } catch (error) {
    if (error instanceof RepositoryAnalysisError) throw error;
  }
  await mkdir(dirname(resolvedOutput), { recursive: true });
  const temporaryDirectory = await mkdtemp(`${resolvedOutput}.tmp-`);
  try {
    await writeFile(
      `${temporaryDirectory}/snapshot.json`,
      `${JSON.stringify(validated, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryDirectory, resolvedOutput);
    return `${resolvedOutput}/snapshot.json`;
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
}

export async function traceWorkflow(
  options: TraceWorkflowOptions,
): Promise<WorkflowBundle> {
  const snapshot = validateSnapshotForWrite(options.snapshot);
  const catalog = findWorkflowCatalogEntry(options.workflowId);
  if (!catalog) {
    throw new RepositoryAnalysisError(
      `Workflow '${options.workflowId}' is not supported.`,
      "unsupported-workflow",
    );
  }
  if (
    snapshot.repository.id !== catalog.repositoryId ||
    snapshot.repository.headCommit !== catalog.commitSha
  ) {
    throw new RepositoryAnalysisError(
      "Snapshot does not match the workflow catalog's repository identity and revision.",
      "snapshot-mismatch",
    );
  }
  const checkout = await assertUsableCheckout(
    options.repositoryPath,
    options.outputDirectory,
    options.signal,
  );
  const treeId = await gitText(
    checkout.repositoryPath,
    ["rev-parse", "HEAD^{tree}"],
    options.signal,
  );
  const repositoryId = contentIdentity({
    headCommit: checkout.headCommit,
    treeId,
  });
  if (
    checkout.headCommit !== catalog.commitSha ||
    repositoryId !== catalog.repositoryId
  ) {
    throw new RepositoryAnalysisError(
      "Checkout does not match the workflow catalog's repository identity and revision.",
      "checkout-mismatch",
    );
  }

  const omissions: Omission[] = [];
  const steps: WorkflowBundle["steps"] = [];
  for (const entry of catalog.steps) {
    if (entry.kind === "history") {
      const history = await collectHistory(
        checkout.repositoryPath,
        false,
        options.signal,
      );
      const commit = history.commits.find(
        (item) => item.sha === catalog.commitSha,
      );
      if (!commit) {
        omissions.push({
          reason: "missing-object",
          path: null,
          detail: "The catalogued revision was unavailable in local history.",
        });
        steps.push({
          id: entry.id,
          kind: entry.kind,
          label: entry.label,
          evidence: {
            type: "unavailable",
            reason: "Selected history is unavailable.",
          },
        });
      } else {
        steps.push({
          id: entry.id,
          kind: entry.kind,
          label: entry.label,
          evidence: { type: "history", commit },
        });
      }
      continue;
    }
    const path = entry.path;
    if (!path) continue;
    try {
      const objectId = await gitText(
        checkout.repositoryPath,
        ["rev-parse", `HEAD:${path}`],
        options.signal,
      );
      const blob = await runGit(
        checkout.repositoryPath,
        ["cat-file", "blob", objectId],
        options.signal,
        256 * 1024,
      );
      if (blob.exceededLimit) {
        omissions.push({
          reason: "per-file-byte-limit",
          path,
          detail: "Workflow evidence exceeds the 256 KB per-file limit.",
        });
        steps.push({
          id: entry.id,
          kind: entry.kind,
          label: entry.label,
          evidence: {
            type: "unavailable",
            reason: "Evidence exceeded the local capture limit.",
          },
        });
        continue;
      }
      if (blob.stdout.includes(0)) throw new Error("binary");
      const text = new TextDecoder("utf-8", { fatal: true }).decode(
        blob.stdout,
      );
      if (!text) throw new Error("empty");
      const source = {
        repositoryId,
        commitSha: checkout.headCommit,
        path,
        lines: { start: 1, end: text.split("\n").length },
      };
      steps.push({
        id: entry.id,
        kind: entry.kind,
        label: entry.label,
        evidence: {
          type: "source",
          contentId: contentIdentity({ source, text }),
          source,
          text,
        },
      });
    } catch {
      omissions.push({
        reason: "missing-object",
        path,
        detail:
          "The catalogued workflow evidence could not be read at the selected revision.",
      });
      steps.push({
        id: entry.id,
        kind: entry.kind,
        label: entry.label,
        evidence: {
          type: "unavailable",
          reason: "Evidence is unavailable at this revision.",
        },
      });
    }
  }
  const bundle = validateWorkflowBundleForWrite({
    schemaVersion: 1,
    contentIdentity: contentIdentity({
      workflow: catalog.id,
      snapshot: snapshot.contentIdentity,
      steps,
      omissions,
    }),
    workflow: { id: catalog.id, catalogVersion: catalog.version },
    snapshot: {
      contentIdentity: snapshot.contentIdentity,
      repository: snapshot.repository,
    },
    collectedAt: new Date().toISOString(),
    steps,
    omissions,
  });
  return bundle;
}

export async function writeWorkflowBundle(
  repositoryPath: string,
  outputDirectory: string,
  bundle: unknown,
): Promise<string> {
  const validated = validateWorkflowBundleForWrite(bundle);
  const resolvedRepository = resolve(repositoryPath);
  const resolvedOutput = resolve(outputDirectory);
  if (outputIsInsideRepository(resolvedRepository, resolvedOutput)) {
    throw new RepositoryAnalysisError(
      "Output directory must be outside the target repository.",
      "output-inside-repository",
    );
  }
  try {
    await access(resolvedOutput);
    throw new RepositoryAnalysisError(
      "Output directory already exists.",
      "output-exists",
    );
  } catch (error) {
    if (error instanceof RepositoryAnalysisError) throw error;
  }
  await mkdir(dirname(resolvedOutput), { recursive: true });
  const temporaryDirectory = await mkdtemp(`${resolvedOutput}.tmp-`);
  try {
    await writeFile(
      `${temporaryDirectory}/workflow.json`,
      `${JSON.stringify(validated, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryDirectory, resolvedOutput);
    return `${resolvedOutput}/workflow.json`;
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
}

export async function evaluateEvidence(
  options: EvaluateEvidenceOptions,
): Promise<EvaluationReport> {
  const snapshot = validateSnapshotForWrite(options.snapshot);
  const workflow = validateWorkflowBundleForWrite(options.workflow);
  if (
    snapshot.repository.id !== openSpecEvaluationCatalog.repositoryId ||
    snapshot.repository.headCommit !== openSpecEvaluationCatalog.commitSha ||
    workflow.snapshot.repository.id !== snapshot.repository.id ||
    workflow.snapshot.repository.headCommit !== snapshot.repository.headCommit
  ) {
    throw new RepositoryAnalysisError(
      "Evaluation inputs do not match the pinned catalog revision.",
      "evaluation-mismatch",
    );
  }
  if (options.signal?.aborted)
    throw new RepositoryAnalysisError("Analysis was canceled.", "canceled");
  const observed = workflow.steps.flatMap((step) =>
    step.evidence.type === "source"
      ? [{ category: step.kind, source: step.evidence.source }]
      : step.evidence.type === "history"
        ? [
            {
              category: step.kind,
              source: {
                repositoryId: snapshot.repository.id,
                commitSha: step.evidence.commit.sha,
                path: "",
                lines: null,
              },
            },
          ]
        : [],
  );
  return validateEvaluationReportForWrite({
    schemaVersion: 1,
    repository: snapshot.repository,
    catalogId: openSpecEvaluationCatalog.id,
    evaluatedAt: new Date().toISOString(),
    results: openSpecEvaluationCatalog.cases.map((item) => {
      const candidate = observed.find(
        (entry) => entry.category === item.category,
      );
      const sourceMatches =
        candidate?.source.repositoryId === item.expectedSource.repositoryId &&
        candidate.source.commitSha === item.expectedSource.commitSha &&
        (item.category === "history" ||
          candidate.source.path === item.expectedSource.path);
      return {
        caseId: item.id,
        expectedSource: item.expectedSource,
        observedSource: candidate
          ? item.category === "history"
            ? item.expectedSource
            : candidate.source
          : null,
        status: candidate
          ? sourceMatches
            ? "passed"
            : "failed"
          : "unavailable",
      };
    }),
    omissions: workflow.omissions,
  });
}

export async function writeEvaluationReport(
  repositoryPath: string,
  outputDirectory: string,
  report: unknown,
): Promise<string> {
  const validated = validateEvaluationReportForWrite(report);
  const resolvedRepository = resolve(repositoryPath);
  const resolvedOutput = resolve(outputDirectory);
  if (outputIsInsideRepository(resolvedRepository, resolvedOutput))
    throw new RepositoryAnalysisError(
      "Output directory must be outside the target repository.",
      "output-inside-repository",
    );
  try {
    await access(resolvedOutput);
    throw new RepositoryAnalysisError(
      "Output directory already exists.",
      "output-exists",
    );
  } catch (error) {
    if (error instanceof RepositoryAnalysisError) throw error;
  }
  await mkdir(dirname(resolvedOutput), { recursive: true });
  const temporaryDirectory = await mkdtemp(`${resolvedOutput}.tmp-`);
  try {
    await writeFile(
      `${temporaryDirectory}/evaluation.json`,
      `${JSON.stringify(validated, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryDirectory, resolvedOutput);
    return `${outputDirectory}/evaluation.json`;
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
}

export { openSpecAnswerBenchmark } from "./answer-benchmark.js";
export {
  loadAnswerComparisonInputs,
  writeAnswerComparisonReport,
} from "./answer-evaluation.js";
export { loadEvidenceArtifacts, readBoundedJson } from "./artifacts.js";
