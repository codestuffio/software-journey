import { z } from "zod";

const gitObjectIdSchema = z.string().regex(/^[0-9a-f]{40,64}$/u);
const contentIdentitySchema = z.string().regex(/^sha256:[0-9a-f]{64}$/u);
const hasControlCharacter = (value: string) =>
  Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return (
      codePoint !== undefined &&
      (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f))
    );
  });
const safePathSchema = z
  .string()
  .min(1)
  .refine(
    (value) => !hasControlCharacter(value),
    "Path must not contain control characters",
  );

export const sourceReferenceSchema = z
  .object({
    repositoryId: contentIdentitySchema,
    commitSha: gitObjectIdSchema,
    path: safePathSchema,
    lines: z
      .object({
        start: z.number().int().positive(),
        end: z.number().int().positive(),
      })
      .refine((lines) => lines.end >= lines.start, {
        message: "Line range end must not precede its start",
      })
      .nullable(),
  })
  .strict();

export type SourceReference = z.infer<typeof sourceReferenceSchema>;

export const omissionReasonSchema = z.enum([
  "binary",
  "symlink",
  "submodule",
  "default-exclusion",
  "invalid-path-encoding",
  "unsafe-path-character",
  "inventory-limit",
  "per-file-byte-limit",
  "total-byte-limit",
  "history-limit",
  "dirty-worktree",
  "untracked-worktree",
  "missing-object",
]);

export const omissionSchema = z
  .object({
    reason: omissionReasonSchema,
    path: safePathSchema.nullable(),
    detail: z.string().min(1).nullable(),
  })
  .strict();

export type Omission = z.infer<typeof omissionSchema>;

export const inventoryEntrySchema = z
  .object({
    path: safePathSchema,
    objectId: gitObjectIdSchema,
    mode: z.enum(["file", "executable"]),
  })
  .strict();

export type InventoryEntry = z.infer<typeof inventoryEntrySchema>;

export const documentationExtractSchema = z
  .object({
    contentId: contentIdentitySchema,
    source: sourceReferenceSchema,
    text: z.string().min(1),
  })
  .strict();

export type DocumentationExtract = z.infer<typeof documentationExtractSchema>;

export const commitMetadataSchema = z
  .object({
    sha: gitObjectIdSchema,
    parentShas: z.array(gitObjectIdSchema),
    authoredAt: z.string().datetime({ offset: true }),
    subject: z.string(),
  })
  .strict();

export type CommitMetadata = z.infer<typeof commitMetadataSchema>;

export const coverageSchema = z
  .object({
    inventory: z
      .object({
        discoveredEntries: z.number().int().nonnegative(),
        recordedEntries: z.number().int().nonnegative(),
      })
      .strict(),
    documentation: z
      .object({
        eligibleFiles: z.number().int().nonnegative(),
        extractedFiles: z.number().int().nonnegative(),
        extractedBytes: z.number().int().nonnegative(),
      })
      .strict(),
    history: z
      .object({
        requestedCommits: z.number().int().positive(),
        recordedCommits: z.number().int().nonnegative(),
        completeness: z.enum(["complete", "shallow", "limited", "unavailable"]),
      })
      .strict(),
    omissions: z.array(omissionSchema),
  })
  .strict();

export const snapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    contentIdentity: contentIdentitySchema,
    repository: z
      .object({
        id: contentIdentitySchema,
        headCommit: gitObjectIdSchema,
      })
      .strict(),
    inventory: z.array(inventoryEntrySchema),
    documentation: z.array(documentationExtractSchema),
    history: z.array(commitMetadataSchema),
    coverage: coverageSchema,
    run: z
      .object({
        analyzerVersion: z.string().min(1),
        startedAt: z.string().datetime({ offset: true }),
        completedAt: z.string().datetime({ offset: true }),
        durationMs: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export type Snapshot = z.infer<typeof snapshotSchema>;

/** Validates untrusted serialized data before an analyzer exposes a snapshot. */
export function validateSnapshotForWrite(value: unknown): Snapshot {
  return snapshotSchema.parse(value);
}

/** Shared vocabulary for future knowledge consumers. */
export type KnowledgeAudience = "human" | "agent";
