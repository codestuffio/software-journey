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

export const explorerLimits = {
  maximumDocumentationExtracts: 48,
  maximumExtractTextCharacters: 24_000,
} as const;

export const explorerProjectionSchema = z
  .object({
    repository: snapshotSchema.shape.repository,
    run: snapshotSchema.shape.run,
    coverage: coverageSchema,
    documentation: z.array(
      documentationExtractSchema.extend({
        textTruncated: z.boolean(),
      }),
    ),
    totalDocumentationExtracts: z.number().int().nonnegative(),
    projectionTruncated: z.boolean(),
  })
  .strict();

export type ExplorerProjection = z.infer<typeof explorerProjectionSchema>;

export const workflowStepKindSchema = z.enum([
  "command",
  "specification",
  "implementation",
  "test",
  "history",
]);

export const workflowEvidenceSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("source"),
      contentId: contentIdentitySchema,
      source: sourceReferenceSchema,
      text: z.string().min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal("history"),
      commit: commitMetadataSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("unavailable"),
      reason: z.string().min(1),
    })
    .strict(),
]);

export const workflowStepSchema = z
  .object({
    id: z.string().min(1),
    kind: workflowStepKindSchema,
    label: z.string().min(1),
    evidence: workflowEvidenceSchema,
  })
  .strict();

export const workflowBundleSchema = z
  .object({
    schemaVersion: z.literal(1),
    contentIdentity: contentIdentitySchema,
    workflow: z
      .object({
        id: z.string().min(1),
        catalogVersion: z.string().min(1),
      })
      .strict(),
    snapshot: z
      .object({
        contentIdentity: contentIdentitySchema,
        repository: snapshotSchema.shape.repository,
      })
      .strict(),
    collectedAt: z.string().datetime({ offset: true }),
    steps: z.array(workflowStepSchema).min(1).max(12),
    omissions: z.array(omissionSchema),
  })
  .strict();

export type WorkflowBundle = z.infer<typeof workflowBundleSchema>;

export const evaluationCaseSchema = z
  .object({
    id: z.string().min(1),
    question: z.string().min(1),
    category: workflowStepKindSchema,
    expectedSource: sourceReferenceSchema,
  })
  .strict();
export type EvaluationCase = z.infer<typeof evaluationCaseSchema>;
export const evaluationReportSchema = z
  .object({
    schemaVersion: z.literal(1),
    repository: snapshotSchema.shape.repository,
    catalogId: z.string().min(1),
    evaluatedAt: z.string().datetime({ offset: true }),
    results: z
      .array(
        z
          .object({
            caseId: z.string().min(1),
            status: z.enum(["passed", "failed", "unavailable"]),
            expectedSource: sourceReferenceSchema,
            observedSource: sourceReferenceSchema.nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(12),
    omissions: z.array(omissionSchema),
  })
  .strict();
export type EvaluationReport = z.infer<typeof evaluationReportSchema>;
export function validateEvaluationReportForWrite(
  value: unknown,
): EvaluationReport {
  return evaluationReportSchema.parse(value);
}

export const workflowExplorerLimits = {
  maximumSteps: 12,
  maximumExtractTextCharacters: 32_000,
} as const;

export const workflowExplorerProjectionSchema = workflowBundleSchema.extend({
  steps: z.array(
    workflowStepSchema.extend({
      evidence: workflowEvidenceSchema.transform((evidence) =>
        evidence.type === "source"
          ? {
              ...evidence,
              text: evidence.text.slice(
                0,
                workflowExplorerLimits.maximumExtractTextCharacters,
              ),
              textTruncated:
                evidence.text.length >
                workflowExplorerLimits.maximumExtractTextCharacters,
            }
          : evidence,
      ),
    }),
  ),
});

export type WorkflowExplorerProjection = z.infer<
  typeof workflowExplorerProjectionSchema
>;

export function createWorkflowExplorerProjection(
  value: unknown,
): WorkflowExplorerProjection {
  const bundle = workflowBundleSchema.parse(value);
  return workflowExplorerProjectionSchema.parse({
    ...bundle,
    steps: bundle.steps.slice(0, workflowExplorerLimits.maximumSteps),
  });
}

export function validateWorkflowBundleForWrite(value: unknown): WorkflowBundle {
  return workflowBundleSchema.parse(value);
}

/** Creates a bounded, browser-safe view of a validated local snapshot. */
export function createExplorerProjection(value: unknown): ExplorerProjection {
  const snapshot = snapshotSchema.parse(value);
  const documentation = snapshot.documentation
    .slice(0, explorerLimits.maximumDocumentationExtracts)
    .map((extract) => {
      const textTruncated =
        extract.text.length > explorerLimits.maximumExtractTextCharacters;

      return {
        ...extract,
        text: textTruncated
          ? `${extract.text.slice(0, explorerLimits.maximumExtractTextCharacters)}\n\n[Captured extract truncated for this local view.]`
          : extract.text,
        textTruncated,
      };
    });

  return explorerProjectionSchema.parse({
    repository: snapshot.repository,
    run: snapshot.run,
    coverage: snapshot.coverage,
    documentation,
    totalDocumentationExtracts: snapshot.documentation.length,
    projectionTruncated:
      snapshot.documentation.length >
        explorerLimits.maximumDocumentationExtracts ||
      documentation.some((extract) => extract.textTruncated),
  });
}

/** Validates untrusted serialized data before an analyzer exposes a snapshot. */
export function validateSnapshotForWrite(value: unknown): Snapshot {
  return snapshotSchema.parse(value);
}

/** Shared vocabulary for future knowledge consumers. */
export type KnowledgeAudience = "human" | "agent";
