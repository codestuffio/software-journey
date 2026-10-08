import { resolve } from "node:path";
import {
  type SourceCapture,
  type SourceCaptureEntry,
  sourceCaptureContentIdentity,
  sourceCaptureLimits,
  sourceCaptureRequestSchema,
  sourceTextDigest,
  validateSnapshotForWrite,
  validateSourceCapture,
} from "@software-journey/contracts";
import { writeExclusiveArtifact } from "./artifact-output.js";
import {
  contentIdentity,
  type GitResult,
  gitText,
  isSafetyExcluded,
  RepositoryAnalysisError,
  runGit,
  safelyDecodePath,
} from "./git.js";

export interface CaptureSourcesOptions {
  repositoryPath: string;
  snapshot: unknown;
  request: unknown;
  signal?: AbortSignal;
}

type BlobResult =
  | { lines: string[] }
  | { reason: SourceCaptureEntry["reasons"][number] };
function decodeSourceBlob(buffer: Buffer): BlobResult {
  if (buffer.includes(0)) return { reason: "binary" };
  try {
    // The leading BOM and line separators are part of the committed bytes.
    const text = new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: true,
    }).decode(buffer);
    const lines = text.split("\n");
    for (let index = 0; index < lines.length - 1; index++) lines[index] += "\n";
    return { lines };
  } catch {
    return { reason: "invalid-utf8" };
  }
}

/** Collect in memory only. Publication and input-file loading are separate boundaries. */
export async function captureSources(
  options: CaptureSourcesOptions,
): Promise<SourceCapture> {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const deadline = AbortSignal.timeout(sourceCaptureLimits.deadlineMs);
  const signal = options.signal
    ? AbortSignal.any([options.signal, deadline])
    : deadline;
  const check = () => {
    if (
      signal.aborted ||
      Date.now() - started >= sourceCaptureLimits.deadlineMs
    ) {
      throw new RepositoryAnalysisError(
        deadline.aborted
          ? "Source capture exceeded its deadline."
          : "Source capture was canceled.",
        deadline.aborted ? "timeout" : "canceled",
      );
    }
  };
  try {
    check();
    const request = sourceCaptureRequestSchema.parse(options.request);
    const snapshot = validateSnapshotForWrite(options.snapshot);
    if (
      Buffer.byteLength(`${JSON.stringify(snapshot)}\n`) >
      sourceCaptureLimits.maximumSnapshotBytes
    ) {
      throw new RepositoryAnalysisError(
        "Snapshot byte limit exceeded.",
        "snapshot-byte-limit",
      );
    }
    const repositoryPath = resolve(options.repositoryPath);
    if (
      (await gitText(
        repositoryPath,
        ["rev-parse", "--is-inside-work-tree"],
        signal,
      )) !== "true"
    ) {
      throw new RepositoryAnalysisError(
        "Path is not a Git working tree.",
        "not-repository",
      );
    }
    const headCommit = await gitText(
      repositoryPath,
      ["rev-parse", "--verify", "HEAD"],
      signal,
    );
    const treeId = await gitText(
      repositoryPath,
      ["rev-parse", `${headCommit}^{tree}`],
      signal,
    );
    if (
      headCommit !== snapshot.repository.headCommit ||
      contentIdentity({ headCommit, treeId }) !== snapshot.repository.id
    ) {
      throw new RepositoryAnalysisError(
        "Checkout does not match the selected snapshot.",
        "checkout-mismatch",
      );
    }
    const entries: SourceCaptureEntry[] = [];
    const blobs: SourceCapture["blobs"] = [];
    const cache = new Map<string, BlobResult>();
    let bytesRead = 0;
    let bytesReturned = 0;
    for (const selection of request.selections) {
      check();
      const entry: SourceCaptureEntry = {
        selection,
        status: "unavailable",
        blobId: null,
        fileLineCount: null,
        actualRange: null,
        text: null,
        contentDigest: null,
        missingRanges: [selection.lines],
        reasons: [],
      };
      entries.push(entry);
      if (isSafetyExcluded(selection.path)) {
        entry.reasons.push("default-exclusion");
        continue;
      }
      let tree: GitResult & { exceededLimit: boolean };
      try {
        tree = await runGit(
          repositoryPath,
          ["ls-tree", "-z", "--full-tree", headCommit, "--", selection.path],
          signal,
          sourceCaptureLimits.maximumRequestBytes + 256,
        );
      } catch (error) {
        if (
          !(error instanceof RepositoryAnalysisError) ||
          error.code !== "git-failed"
        )
          throw error;
        entry.reasons.push("missing-object");
        continue;
      }
      if (tree.exceededLimit)
        throw new RepositoryAnalysisError(
          "Selected tree entry exceeded its bound.",
          "tree-byte-limit",
        );
      const records = tree.stdout
        .toString("binary")
        .split("\0")
        .filter(Boolean);
      const record = records.find((candidate) => {
        const path = safelyDecodePath(
          Buffer.from(candidate.slice(candidate.indexOf("\t") + 1), "binary"),
        );
        return path.path === selection.path;
      });
      if (!record) {
        entry.reasons.push("missing-path");
        continue;
      }
      const [mode, type, objectId] = record
        .slice(0, record.indexOf("\t"))
        .split(" ");
      if (mode === "120000") {
        entry.reasons.push("symlink");
        continue;
      }
      if (mode === "160000" || type === "commit") {
        entry.reasons.push("submodule");
        continue;
      }
      if (
        (mode !== "100644" && mode !== "100755") ||
        type !== "blob" ||
        !objectId
      ) {
        entry.reasons.push("unsupported-mode");
        continue;
      }
      entry.blobId = objectId;
      let blob = cache.get(objectId);
      if (!blob) {
        try {
          const size = Number(
            await gitText(repositoryPath, ["cat-file", "-s", objectId], signal),
          );
          if (!Number.isSafeInteger(size) || size < 0)
            throw new RepositoryAnalysisError(
              "Invalid blob size.",
              "invalid-object",
            );
          if (size > sourceCaptureLimits.maximumBlobBytes)
            blob = { reason: "blob-byte-limit" };
          else if (size > sourceCaptureLimits.maximumReadBytes - bytesRead)
            blob = { reason: "read-byte-limit" };
          else {
            const result = await runGit(
              repositoryPath,
              ["cat-file", "blob", objectId],
              signal,
              size,
            );
            if (result.exceededLimit || result.stdout.length !== size)
              throw new RepositoryAnalysisError(
                "Committed blob changed size.",
                "invalid-object",
              );
            bytesRead += size;
            blobs.push({ objectId, bytesRead: size });
            blob = decodeSourceBlob(result.stdout);
          }
        } catch (error) {
          if (
            !(error instanceof RepositoryAnalysisError) ||
            error.code !== "git-failed"
          )
            throw error;
          blob = { reason: "missing-object" };
        }
        cache.set(objectId, blob);
      }
      if ("reason" in blob) {
        entry.reasons.push(blob.reason);
        continue;
      }
      const lines = blob.lines;
      entry.fileLineCount = lines.length;
      if (selection.lines.start > lines.length) {
        entry.reasons.push("range-beyond-eof");
        continue;
      }
      const intersectionEnd = Math.min(selection.lines.end, lines.length);
      const remainingTotal =
        sourceCaptureLimits.maximumTextBytes - bytesReturned;
      const budget = Math.min(
        sourceCaptureLimits.maximumSelectionTextBytes,
        remainingTotal,
      );
      let textBytes = 0;
      let end = selection.lines.start - 1;
      const retained: string[] = [];
      for (
        let number = selection.lines.start;
        number <= intersectionEnd;
        number++
      ) {
        check();
        const line = lines[number - 1];
        if (line === undefined)
          throw new RepositoryAnalysisError(
            "Invalid source line.",
            "invalid-object",
          );
        const size = Buffer.byteLength(line);
        if (textBytes + size > budget) {
          entry.reasons.push(
            remainingTotal < sourceCaptureLimits.maximumSelectionTextBytes
              ? "total-text-byte-limit"
              : "text-byte-limit",
          );
          break;
        }
        retained.push(line);
        textBytes += size;
        end = number;
      }
      if (selection.lines.end > lines.length)
        entry.reasons.push("range-beyond-eof");
      if (end < selection.lines.start) continue;
      entry.text = retained.join("");
      entry.actualRange = { start: selection.lines.start, end };
      entry.contentDigest = await sourceTextDigest(entry.text);
      entry.status = end === selection.lines.end ? "available" : "partial";
      entry.missingRanges =
        end < selection.lines.end
          ? [{ start: end + 1, end: selection.lines.end }]
          : [];
      bytesReturned += textBytes;
    }
    check();
    const completedAt = new Date().toISOString();
    const artifact = {
      schemaVersion: 1,
      contentIdentity: `sha256:${"0".repeat(64)}`,
      snapshot: {
        contentIdentity: snapshot.contentIdentity,
        repository: snapshot.repository,
      },
      limits: sourceCaptureLimits,
      selections: request.selections,
      entries,
      blobs: blobs.sort((a, b) =>
        a.objectId < b.objectId ? -1 : a.objectId > b.objectId ? 1 : 0,
      ),
      coverage: {
        requestedSelections: entries.length,
        capturedSelections: entries.filter(
          (entry) => entry.status !== "unavailable",
        ).length,
        partialSelections: entries.filter((entry) => entry.status === "partial")
          .length,
        unavailableSelections: entries.filter(
          (entry) => entry.status === "unavailable",
        ).length,
        bytesRead,
        bytesReturned,
      },
      run: {
        collectorVersion: "1",
        startedAt,
        completedAt,
        durationMs: Date.parse(completedAt) - started,
      },
    };
    artifact.contentIdentity = await sourceCaptureContentIdentity(artifact);
    const validated = await validateSourceCapture(artifact, snapshot, signal);
    check();
    return validated;
  } catch (error) {
    check();
    throw error;
  }
}

/** One deadline covers collection, validation, staging and publication. */
export async function captureSourcesToDirectory(
  options: CaptureSourcesOptions & { outputDirectory: string },
): Promise<string> {
  const started = Date.now();
  const deadline = AbortSignal.timeout(sourceCaptureLimits.deadlineMs);
  const signal = options.signal
    ? AbortSignal.any([options.signal, deadline])
    : deadline;
  const check = () => {
    if (
      signal.aborted ||
      Date.now() - started >= sourceCaptureLimits.deadlineMs
    ) {
      const timedOut =
        deadline.aborted ||
        Date.now() - started >= sourceCaptureLimits.deadlineMs;
      throw new RepositoryAnalysisError(
        timedOut
          ? "Source capture exceeded its deadline."
          : "Source capture was canceled.",
        timedOut ? "timeout" : "canceled",
      );
    }
  };
  try {
    check();
    const capture = await captureSources({ ...options, signal });
    const text = `${JSON.stringify(capture)}\n`;
    if (Buffer.byteLength(text) > sourceCaptureLimits.maximumArtifactBytes)
      throw new RepositoryAnalysisError(
        "Source artifact byte limit exceeded.",
        "artifact-byte-limit",
      );
    check();
    return await writeExclusiveArtifact(
      options.outputDirectory,
      "source-capture.json",
      text,
      signal,
      check,
    );
  } catch (error) {
    check();
    throw error;
  }
}
