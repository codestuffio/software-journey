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

export const retrievalLimits = {
  artifactBytes: 32 * 1024 * 1024,
  requestBytes: 16 * 1024,
  minimumBytes: 4096,
  defaultBytes: 32768,
  maximumBytes: 262144,
  deadlineMs: 10000,
} as const;

export const retrievalBudgetSchema = z
  .number()
  .int()
  .min(retrievalLimits.minimumBytes)
  .max(retrievalLimits.maximumBytes);
export const lineRangeSchema = z
  .object({
    start: z.number().int().positive().safe(),
    end: z.number().int().positive().safe(),
  })
  .strict()
  .refine((range) => range.end >= range.start, "Invalid line range");
export const evidenceSelectorSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("path"),
      path: safePathSchema,
      lines: lineRangeSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("source"),
      repositoryId: contentIdentitySchema,
      commitSha: gitObjectIdSchema,
      path: safePathSchema,
      lines: lineRangeSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("step"),
      workflowId: z.string().min(1),
      stepId: z.string().min(1),
      lines: lineRangeSchema.optional(),
    })
    .strict(),
]);
export const retrievalRequestSchema = z
  .object({
    schemaVersion: z.literal(1),
    maxBytes: retrievalBudgetSchema.default(retrievalLimits.defaultBytes),
    selector: evidenceSelectorSchema,
  })
  .strict();
export const discoveryRequestSchema = z
  .object({
    maxBytes: retrievalBudgetSchema.default(retrievalLimits.defaultBytes),
    offset: z.number().int().nonnegative().safe().default(0),
  })
  .strict();
export type EvidenceSelector = z.infer<typeof evidenceSelectorSchema>;
export type RetrievalRequest = z.infer<typeof retrievalRequestSchema>;
export type LineRange = z.infer<typeof lineRangeSchema>;
const availabilitySchema = z.enum(["available", "partial", "unavailable"]);
const nonnegativeInteger = z.number().int().nonnegative().safe();
const itemBase = {
  id: z.string().min(1),
  origin: z.enum(["documentation", "workflow"]),
  status: availabilitySchema,
  reasons: z.array(z.string()),
};
export const retrievalItemSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...itemBase,
      type: z.literal("source"),
      contentId: contentIdentitySchema,
      source: sourceReferenceSchema,
      text: z.string().min(1),
      missingRanges: z.array(lineRangeSchema),
      omittedLines: nonnegativeInteger,
    })
    .strict(),
  z
    .object({
      ...itemBase,
      type: z.literal("history"),
      commit: commitMetadataSchema,
    })
    .strict(),
  z
    .object({
      ...itemBase,
      type: z.literal("unavailable"),
      missingRanges: z.array(lineRangeSchema),
    })
    .strict(),
]);
export type RetrievalItem = z.infer<typeof retrievalItemSchema>;
export const evidenceDescriptorSchema = z
  .object({
    ...itemBase,
    selector: evidenceSelectorSchema,
    source: sourceReferenceSchema.nullable(),
    commitSha: gitObjectIdSchema.nullable(),
    label: z.string().nullable(),
  })
  .strict();
export type EvidenceDescriptor = z.infer<typeof evidenceDescriptorSchema>;
const responseBase = {
  schemaVersion: z.literal(1),
  repository: snapshotSchema.shape.repository,
  inputs: z
    .object({
      snapshot: contentIdentitySchema,
      bundle: contentIdentitySchema.nullable(),
    })
    .strict(),
  status: availabilitySchema,
  reasons: z.array(z.string()),
  coverage: z
    .object({
      inventory: coverageSchema.shape.inventory,
      documentation: coverageSchema.shape.documentation,
      history: coverageSchema.shape.history,
      workflowSteps: nonnegativeInteger,
      totalOmissions: nonnegativeInteger,
      relevantOmissions: nonnegativeInteger,
      omissions: z.array(omissionSchema),
      omittedDetails: nonnegativeInteger,
    })
    .strict(),
  budget: z
    .object({
      maxBytes: retrievalBudgetSchema,
      returnedBytes: nonnegativeInteger,
      omittedItems: nonnegativeInteger,
      omittedLines: nonnegativeInteger,
    })
    .strict(),
};
export const retrievalResponseSchema = z
  .object({
    ...responseBase,
    kind: z.literal("retrieval"),
    selector: evidenceSelectorSchema,
    items: z.array(retrievalItemSchema),
  })
  .strict();
export const discoveryResponseSchema = z
  .object({
    ...responseBase,
    kind: z.literal("discovery"),
    offset: nonnegativeInteger,
    totalItems: nonnegativeInteger,
    nextOffset: nonnegativeInteger.nullable(),
    items: z.array(evidenceDescriptorSchema),
  })
  .strict();
export type RetrievalResponse = z.infer<typeof retrievalResponseSchema>;
export type DiscoveryResponse = z.infer<typeof discoveryResponseSchema>;
export type EvidenceResponse = RetrievalResponse | DiscoveryResponse;

/** Match the collector's split-on-newline convention, retaining separators. */
export function capturedLines(text: string): string[] {
  return (
    text
      .match(/[^\n]*\n|[^\n]+$/gu)
      ?.concat(text.endsWith("\n") ? [""] : []) ?? [""]
  );
}

export async function validateRetrievalInputs(
  snapshotValue: unknown,
  bundleValue?: unknown,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const snapshot = snapshotSchema.parse(snapshotValue);
  const bundle =
    bundleValue === undefined
      ? undefined
      : workflowBundleSchema.parse(bundleValue);
  if (
    bundle &&
    (bundle.snapshot.contentIdentity !== snapshot.contentIdentity ||
      bundle.snapshot.repository.id !== snapshot.repository.id ||
      bundle.snapshot.repository.headCommit !== snapshot.repository.headCommit)
  ) {
    throw new Error("Artifact identity mismatch");
  }
  const ids = new Set<string>();
  for (const step of bundle?.steps ?? []) {
    if (ids.has(step.id)) throw new Error("Duplicate workflow step ID");
    ids.add(step.id);
  }
  const captures = [
    ...snapshot.documentation,
    ...(bundle?.steps.flatMap((step) =>
      step.evidence.type === "source" ? [step.evidence] : [],
    ) ?? []),
  ];
  for (let index = 0; index < captures.length; index++) {
    const capture = captures[index];
    if (!capture) continue;
    const { source, text } = capture;
    if (
      source.repositoryId !== snapshot.repository.id ||
      source.commitSha !== snapshot.repository.headCommit
    ) {
      throw new Error("Source identity mismatch");
    }
    if (
      source.lines &&
      source.lines.end - source.lines.start + 1 !== capturedLines(text).length
    ) {
      throw new Error("Source line span does not match captured text");
    }
    if (index % 32 === 0)
      await new Promise((resolve) => setTimeout(resolve, 0));
    signal?.throwIfAborted();
  }
  return { snapshot, bundle };
}
