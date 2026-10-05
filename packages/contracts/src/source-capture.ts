import { z } from "zod";
import type { Snapshot } from "./index.js";

export const sourceCaptureLimits = {
  maximumRequestBytes: 16_384,
  maximumSnapshotBytes: 33_554_432,
  maximumSelections: 16,
  maximumBlobBytes: 262_144,
  maximumReadBytes: 1_048_576,
  maximumSelectionTextBytes: 131_072,
  maximumTextBytes: 524_288,
  maximumArtifactBytes: 2_097_152,
  deadlineMs: 30_000,
} as const;

const byteLength = (text: string) => new TextEncoder().encode(text).byteLength;
const serializedBytes = (value: unknown) =>
  byteLength(`${JSON.stringify(value)}\n`);
const wellFormed = (text: string) => !/[\uD800-\uDFFF]/u.test(text);
const identitySchema = z.string().regex(/^sha256:[0-9a-f]{64}$/u);
const objectIdSchema = z.string().regex(/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u);
const integer = z.number().int().nonnegative().safe();
const rangeSchema = z
  .object({
    start: z.number().int().positive().safe(),
    end: z.number().int().positive().safe(),
  })
  .strict()
  .refine((range) => range.end >= range.start, "Invalid line range");

const hasControlCharacter = (text: string) =>
  Array.from(text).some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code <= 0x1f || (code >= 0x7f && code <= 0x9f);
  });
const exactPathSchema = z
  .string()
  .min(1)
  .refine(
    (path) =>
      wellFormed(path) &&
      !hasControlCharacter(path) &&
      !/[\\*?[\]{}]/u.test(path) &&
      !/^[a-z]:/iu.test(path) &&
      !/[+@!]\(/u.test(path) &&
      path
        .split("/")
        .every(
          (segment) => segment !== "" && segment !== "." && segment !== "..",
        ),
    "Expected an exact repository-relative path",
  );
export const sourceCaptureSelectionSchema = z
  .object({
    path: exactPathSchema,
    lines: rangeSchema,
  })
  .strict();
export type SourceCaptureSelection = z.infer<
  typeof sourceCaptureSelectionSchema
>;

const compareSelections = (
  a: SourceCaptureSelection,
  b: SourceCaptureSelection,
) =>
  a.path < b.path
    ? -1
    : a.path > b.path
      ? 1
      : a.lines.start - b.lines.start || a.lines.end - b.lines.end;
const selectionsSchema = z
  .array(sourceCaptureSelectionSchema)
  .min(1)
  .max(sourceCaptureLimits.maximumSelections)
  .refine(
    (selections) =>
      new Set(selections.map((selection) => JSON.stringify(selection))).size ===
      selections.length,
    "Duplicate source selection",
  );
export const sourceCaptureRequestSchema = z
  .object({
    schemaVersion: z.literal(1),
    selections: selectionsSchema,
  })
  .strict()
  .refine(
    (request) =>
      serializedBytes(request) <= sourceCaptureLimits.maximumRequestBytes,
    "Source request byte limit exceeded",
  )
  .transform((request) => ({
    ...request,
    selections: [...request.selections].sort(compareSelections),
  }));
export type SourceCaptureRequest = z.infer<typeof sourceCaptureRequestSchema>;

const limitsSchema = z
  .object({
    maximumRequestBytes: z.literal(sourceCaptureLimits.maximumRequestBytes),
    maximumSnapshotBytes: z.literal(sourceCaptureLimits.maximumSnapshotBytes),
    maximumSelections: z.literal(sourceCaptureLimits.maximumSelections),
    maximumBlobBytes: z.literal(sourceCaptureLimits.maximumBlobBytes),
    maximumReadBytes: z.literal(sourceCaptureLimits.maximumReadBytes),
    maximumSelectionTextBytes: z.literal(
      sourceCaptureLimits.maximumSelectionTextBytes,
    ),
    maximumTextBytes: z.literal(sourceCaptureLimits.maximumTextBytes),
    maximumArtifactBytes: z.literal(sourceCaptureLimits.maximumArtifactBytes),
    deadlineMs: z.literal(sourceCaptureLimits.deadlineMs),
  })
  .strict();
const bindingSchema = z
  .object({
    contentIdentity: identitySchema,
    repository: z
      .object({ id: identitySchema, headCommit: objectIdSchema })
      .strict(),
  })
  .strict();
export const sourceCaptureReasonSchema = z.enum([
  "missing-path",
  "missing-object",
  "default-exclusion",
  "symlink",
  "submodule",
  "unsupported-mode",
  "binary",
  "invalid-utf8",
  "blob-byte-limit",
  "read-byte-limit",
  "text-byte-limit",
  "total-text-byte-limit",
  "range-beyond-eof",
]);
export const sourceCaptureEntrySchema = z
  .object({
    selection: sourceCaptureSelectionSchema,
    status: z.enum(["available", "partial", "unavailable"]),
    blobId: objectIdSchema.nullable(),
    fileLineCount: z
      .number()
      .int()
      .positive()
      .max(sourceCaptureLimits.maximumBlobBytes + 1)
      .nullable(),
    actualRange: rangeSchema.nullable(),
    text: z
      .string()
      .refine(
        (text) => wellFormed(text) && !text.includes("\0"),
        "Invalid source text",
      )
      .refine(
        (text) =>
          byteLength(text) <= sourceCaptureLimits.maximumSelectionTextBytes,
        "Selection text byte limit exceeded",
      )
      .nullable(),
    contentDigest: identitySchema.nullable(),
    missingRanges: z.array(rangeSchema).max(2),
    reasons: z.array(sourceCaptureReasonSchema).max(16),
  })
  .strict()
  .superRefine((entry, ctx) => {
    const invalid = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    const requested = entry.selection.lines;
    if (entry.blobId === null && entry.fileLineCount !== null)
      invalid("Line count requires a committed blob");
    if (new Set(entry.reasons).size !== entry.reasons.length)
      invalid("Duplicate omission reason");
    if (entry.status === "unavailable") {
      if (
        entry.actualRange !== null ||
        entry.text !== null ||
        entry.contentDigest !== null ||
        entry.reasons.length === 0
      )
        invalid(
          "Unavailable selection must contain only an omission, not source text",
        );
      if (JSON.stringify(entry.missingRanges) !== JSON.stringify([requested]))
        invalid(
          "Unavailable selection must disclose its entire requested range",
        );
      return;
    }
    const { actualRange: actual, text, fileLineCount } = entry;
    if (
      !actual ||
      text === null ||
      fileLineCount === null ||
      entry.blobId === null ||
      entry.contentDigest === null
    ) {
      invalid("Captured selection requires blob, range, text and digest");
      return;
    }
    if (
      actual.start !== requested.start ||
      actual.end > Math.min(requested.end, fileLineCount)
    )
      invalid(
        "Captured range must be a prefix of the requested file intersection",
      );
    // split-on-newline counts the final empty line at EOF. Before EOF, the
    // trailing separator finishes the last captured line, without adding a line.
    const beforeEof = actual.end < fileLineCount;
    const lineCount =
      text.split("\n").length - (beforeEof && text.endsWith("\n") ? 1 : 0);
    if (
      (beforeEof && !text.endsWith("\n")) ||
      lineCount !== actual.end - actual.start + 1
    )
      invalid("Source line span does not match complete captured lines");
    const missing =
      actual.end < requested.end
        ? [{ start: actual.end + 1, end: requested.end }]
        : [];
    if (JSON.stringify(entry.missingRanges) !== JSON.stringify(missing))
      invalid("Missing ranges must exactly cover the uncaptured suffix");
    if (
      entry.status === "available" &&
      (missing.length !== 0 || entry.reasons.length !== 0)
    )
      invalid("Available selection must be complete and have no omissions");
    if (
      entry.status === "partial" &&
      (missing.length === 0 || entry.reasons.length === 0)
    )
      invalid("Partial selection must disclose missing lines and a reason");
  });
export type SourceCaptureEntry = z.infer<typeof sourceCaptureEntrySchema>;

export const sourceCaptureSchema = z
  .object({
    schemaVersion: z.literal(1),
    contentIdentity: identitySchema,
    snapshot: bindingSchema,
    limits: limitsSchema,
    selections: selectionsSchema,
    entries: z
      .array(sourceCaptureEntrySchema)
      .min(1)
      .max(sourceCaptureLimits.maximumSelections),
    blobs: z
      .array(
        z
          .object({
            objectId: objectIdSchema,
            bytesRead: integer.max(sourceCaptureLimits.maximumBlobBytes),
          })
          .strict(),
      )
      .max(sourceCaptureLimits.maximumSelections),
    coverage: z
      .object({
        requestedSelections: integer.max(sourceCaptureLimits.maximumSelections),
        capturedSelections: integer.max(sourceCaptureLimits.maximumSelections),
        partialSelections: integer.max(sourceCaptureLimits.maximumSelections),
        unavailableSelections: integer.max(
          sourceCaptureLimits.maximumSelections,
        ),
        bytesRead: integer.max(sourceCaptureLimits.maximumReadBytes),
        bytesReturned: integer.max(sourceCaptureLimits.maximumTextBytes),
      })
      .strict(),
    run: z
      .object({
        collectorVersion: z.string().min(1).max(128),
        startedAt: z.string().datetime({ offset: true }),
        completedAt: z.string().datetime({ offset: true }),
        durationMs: integer.max(sourceCaptureLimits.deadlineMs),
      })
      .strict(),
  })
  .strict()
  .superRefine((artifact, ctx) => {
    const invalid = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    const selectionKeys = artifact.selections.map((selection) =>
      JSON.stringify(selection),
    );
    if (
      artifact.selections.some((selection, i) => {
        const previous = artifact.selections[i - 1];
        return (
          previous !== undefined && compareSelections(previous, selection) >= 0
        );
      })
    )
      invalid("Artifact selections must be sorted");
    if (
      JSON.stringify(
        artifact.entries.map((entry) => JSON.stringify(entry.selection)),
      ) !== JSON.stringify(selectionKeys)
    )
      invalid("Entries must match selections in order");
    if (
      serializedBytes({ schemaVersion: 1, selections: artifact.selections }) >
      sourceCaptureLimits.maximumRequestBytes
    )
      invalid("Source request byte limit exceeded");
    const blobs = new Map(
      artifact.blobs.map((blob) => [blob.objectId, blob.bytesRead]),
    );
    if (blobs.size !== artifact.blobs.length)
      invalid("Duplicate committed blob read");
    if (
      artifact.blobs.some((blob, i) => {
        const previous = artifact.blobs[i - 1];
        return previous !== undefined && previous.objectId >= blob.objectId;
      })
    )
      invalid("Blob reads must be sorted");
    for (const blob of artifact.blobs)
      if (!artifact.entries.some((entry) => entry.blobId === blob.objectId))
        invalid("Blob read must belong to a selection");
    const pathBlobs = new Map<string, string>();
    const blobLineCounts = new Map<string, number>();
    const captures = new Map<
      string,
      { range: { start: number; end: number }; lines: string[] }[]
    >();
    for (const entry of artifact.entries) {
      if (entry.blobId !== null) {
        const previousBlob = pathBlobs.get(entry.selection.path);
        if (previousBlob !== undefined && previousBlob !== entry.blobId)
          invalid("Selections of one path must identify the same blob");
        pathBlobs.set(entry.selection.path, entry.blobId);
        if (entry.fileLineCount !== null) {
          const previousCount = blobLineCounts.get(entry.blobId);
          if (
            previousCount !== undefined &&
            previousCount !== entry.fileLineCount
          )
            invalid("Selections of one blob must agree on its file line count");
          blobLineCounts.set(entry.blobId, entry.fileLineCount);
        }
        if (entry.actualRange !== null && entry.text !== null) {
          // Keep separators on each line so CRLF and LF cannot compare equal.
          const lines = entry.text.match(/[^\n]*\n|[^\n]+$/gu) ?? [""];
          if (
            entry.actualRange.end === entry.fileLineCount &&
            entry.text.endsWith("\n")
          )
            lines.push("");
          const previousCaptures = captures.get(entry.blobId) ?? [];
          for (const previous of previousCaptures) {
            const start = Math.max(
              entry.actualRange.start,
              previous.range.start,
            );
            const end = Math.min(entry.actualRange.end, previous.range.end);
            for (let line = start; line <= end; line++) {
              if (
                lines[line - entry.actualRange.start] !==
                previous.lines[line - previous.range.start]
              ) {
                invalid(
                  "Overlapping selections of one blob must contain identical source lines",
                );
                break;
              }
            }
          }
          previousCaptures.push({ range: entry.actualRange, lines });
          captures.set(entry.blobId, previousCaptures);
        }
      }
      const readBytes =
        entry.blobId === null ? undefined : blobs.get(entry.blobId);
      if (
        entry.status !== "unavailable" &&
        (readBytes === undefined || byteLength(entry.text ?? "") > readBytes)
      )
        invalid("Captured text must be accounted for by a blob read");
      if (
        entry.actualRange?.start === 1 &&
        entry.actualRange.end === entry.fileLineCount &&
        entry.text !== null &&
        byteLength(entry.text) !== readBytes
      )
        invalid("Whole-file captured text must equal the recorded blob bytes");
      if (
        entry.fileLineCount !== null &&
        (readBytes === undefined || entry.fileLineCount > readBytes + 1)
      )
        invalid("File line count exceeds recorded blob bytes");
    }
    const expectedCoverage = {
      requestedSelections: artifact.selections.length,
      capturedSelections: artifact.entries.filter(
        (entry) => entry.status !== "unavailable",
      ).length,
      partialSelections: artifact.entries.filter(
        (entry) => entry.status === "partial",
      ).length,
      unavailableSelections: artifact.entries.filter(
        (entry) => entry.status === "unavailable",
      ).length,
      bytesRead: artifact.blobs.reduce(
        (total, blob) => total + blob.bytesRead,
        0,
      ),
      bytesReturned: artifact.entries.reduce(
        (total, entry) => total + byteLength(entry.text ?? ""),
        0,
      ),
    };
    for (const key of Object.keys(
      expectedCoverage,
    ) as (keyof typeof expectedCoverage)[])
      if (artifact.coverage[key] !== expectedCoverage[key])
        invalid(`Inconsistent source coverage: ${key}`);
    if (
      Date.parse(artifact.run.completedAt) -
        Date.parse(artifact.run.startedAt) !==
      artifact.run.durationMs
    )
      invalid("Inconsistent run duration");
    if (serializedBytes(artifact) > sourceCaptureLimits.maximumArtifactBytes)
      invalid("Source artifact byte limit exceeded");
  });
export type SourceCapture = z.infer<typeof sourceCaptureSchema>;

async function sha256(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
/** Digest exact decoded UTF-8 bytes, preserving CRLF and final separators. */
export async function sourceTextDigest(text: string): Promise<string> {
  if (!wellFormed(text) || text.includes("\0"))
    throw new Error("Invalid source text");
  return sha256(text);
}
function semanticIdentity(artifact: SourceCapture): Promise<string> {
  const { contentIdentity: _identity, run: _run, ...semantic } = artifact;
  const canonical = JSON.stringify(semantic, (_, nested) =>
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? Object.fromEntries(
          Object.entries(nested).sort(([a], [b]) =>
            a < b ? -1 : a > b ? 1 : 0,
          ),
        )
      : nested,
  );
  return sha256(canonical);
}
/** Timestamps are run metadata; they do not change the evidence identity. */
export async function sourceCaptureContentIdentity(
  value: unknown,
): Promise<string> {
  return semanticIdentity(sourceCaptureSchema.parse(value));
}
/** Hashes prove internal consistency, not authorship or repository lineage. */
export async function validateSourceCapture(
  value: unknown,
  snapshot: Pick<Snapshot, "contentIdentity" | "repository">,
  signal?: AbortSignal,
): Promise<SourceCapture> {
  signal?.throwIfAborted();
  const artifact = sourceCaptureSchema.parse(value);
  const binding = bindingSchema.parse({
    contentIdentity: snapshot.contentIdentity,
    repository: snapshot.repository,
  });
  if (
    artifact.snapshot.contentIdentity !== binding.contentIdentity ||
    artifact.snapshot.repository.id !== binding.repository.id ||
    artifact.snapshot.repository.headCommit !== binding.repository.headCommit
  )
    throw new Error("Source capture snapshot identity mismatch");
  for (const entry of artifact.entries) {
    signal?.throwIfAborted();
    if (
      entry.text !== null &&
      (await sourceTextDigest(entry.text)) !== entry.contentDigest
    )
      throw new Error("Source capture text digest mismatch");
  }
  signal?.throwIfAborted();
  if ((await semanticIdentity(artifact)) !== artifact.contentIdentity)
    throw new Error("Source capture content identity mismatch");
  signal?.throwIfAborted();
  return artifact;
}
