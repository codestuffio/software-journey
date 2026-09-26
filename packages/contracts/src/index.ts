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

export const guidedLessonSchema = z
  .object({
    schemaVersion: z.literal(1),
    catalogVersion: z.literal("1"),
    title: z.string(),
    snapshotIdentity: contentIdentitySchema,
    bundleIdentity: contentIdentitySchema,
    steps: z
      .array(
        z
          .object({
            id: z.string(),
            title: z.string(),
            guidance: z.string(),
            question: z.string(),
            choices: z.array(z.string()).length(3),
            correctIndex: z.number().int().min(0).max(2),
            feedback: z.string(),
            evidence: retrievalResponseSchema,
            ready: z.boolean(),
          })
          .strict(),
      )
      .length(5),
  })
  .strict();
export type GuidedLesson = z.infer<typeof guidedLessonSchema>;

export const explanationSourceSchema = z
  .object({
    id: z.string().min(1).max(256),
    source: sourceReferenceSchema,
    text: z.string().min(1).max(32768),
  })
  .strict();
export const explanationContentSchema = z
  .object({
    blocks: z
      .array(
        z
          .object({
            kind: z.enum(["inference", "quote", "unknown"]),
            text: z.string().min(1).max(2000),
            citations: z.array(z.string().min(1).max(256)).max(8),
          })
          .strict(),
      )
      .min(1)
      .max(8),
  })
  .strict();
export const explanationLimitsSchema = z
  .object({
    maxCostUsd: z.number().min(0.0001).max(0.1).default(0.01),
    maxOutputTokens: z.number().int().min(128).max(2000).default(1000),
  })
  .strict();
export const explanationReportSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal("explanation-report"),
    provider: z.literal("OpenAI"),
    model: z.literal("gpt-4.1-mini-2025-04-14"),
    promptVersion: z.literal("1"),
    approvalDigest: contentIdentitySchema,
    inputs: z
      .object({
        snapshot: contentIdentitySchema,
        bundle: contentIdentitySchema.nullable(),
      })
      .strict(),
    repository: snapshotSchema.shape.repository,
    sources: z.array(explanationSourceSchema).min(1).max(8),
    coverage: z
      .object({
        status: availabilitySchema,
        reasons: z.array(z.string()).max(32),
        history: coverageSchema.shape.history.shape.completeness,
      })
      .strict(),
    content: explanationContentSchema,
    responseId: z.string().min(1).max(256),
    elapsedMs: z.number().nonnegative(),
    usage: z
      .object({
        inputTokens: nonnegativeInteger,
        outputTokens: nonnegativeInteger,
      })
      .strict(),
    cost: z
      .object({
        pricingDate: z.literal("2026-09-24"),
        inputPerMillion: z.literal(0.4),
        outputPerMillion: z.literal(1.6),
        maxCostUsd: z.number().positive(),
        estimatedMaximumUsd: z.number().nonnegative(),
        reportedUsageEstimateUsd: z.number().nonnegative(),
      })
      .strict(),
    warning: z.literal(
      "Unverified model interpretation. Citation checks do not establish truth. Costs are estimates at pinned published rates, not a billing guarantee.",
    ),
  })
  .strict();
export type ExplanationReport = z.infer<typeof explanationReportSchema>;
export type ExplanationSource = z.infer<typeof explanationSourceSchema>;
export const explanationProviderResponseSchema = z.object({
  id: z.string().min(1).max(256),
  model: z.string(),
  status: z.string(),
  output: z.array(
    z
      .object({
        type: z.string(),
        content: z
          .array(
            z
              .object({ type: z.string(), text: z.string().optional() })
              .passthrough(),
          )
          .optional(),
      })
      .passthrough(),
  ),
  usage: z.object({
    input_tokens: nonnegativeInteger,
    output_tokens: nonnegativeInteger,
  }),
});

export function validateExplanationContent(
  content: unknown,
  sources: ExplanationSource[],
) {
  const parsed = explanationContentSchema.parse(content);
  for (const block of parsed.blocks) {
    if (block.kind !== "unknown" && block.citations.length === 0)
      throw new Error("Explanation block lacks a citation");
    const selected = block.citations.map((id) => {
      const source = sources.find((item) => item.id === id);
      if (!source) throw new Error("Explanation cites unselected evidence");
      return source;
    });
    if (
      block.kind === "quote" &&
      !selected.some((source) => source.text.includes(block.text))
    )
      throw new Error("Explanation quote does not match source");
  }
  return parsed;
}

export const explanationPreviewSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal("explanation-preview"),
    provider: z.literal("OpenAI"),
    endpoint: z.literal("https://api.openai.com/v1/responses"),
    model: z.literal("gpt-4.1-mini-2025-04-14"),
    promptVersion: z.literal("1"),
    inputs: explanationReportSchema.shape.inputs,
    repository: snapshotSchema.shape.repository,
    sources: z.array(explanationSourceSchema).min(1).max(8),
    coverage: explanationReportSchema.shape.coverage,
    body: z
      .object({
        model: z.literal("gpt-4.1-mini-2025-04-14"),
        store: z.literal(false),
        max_output_tokens: z.number().int().min(128).max(2000),
        instructions: z.string().max(2000),
        input: z.string().max(65536),
        text: z
          .object({
            format: z
              .object({
                type: z.literal("json_schema"),
                name: z.literal("evidence_explanation"),
                strict: z.literal(true),
                schema: z.unknown(),
              })
              .strict(),
          })
          .strict(),
      })
      .strict(),
    limits: explanationLimitsSchema.extend({
      estimatedInputTokens: nonnegativeInteger,
    }),
    cost: explanationReportSchema.shape.cost.omit({
      reportedUsageEstimateUsd: true,
    }),
    notice: z.string(),
    approvalDigest: contentIdentitySchema,
  })
  .strict();

export const answerEvaluationLimits = {
  inputBytes: 1048576,
  evidenceBytes: 134217728,
  reportBytes: 4194304,
  cases: 20,
  trials: 100,
  deadlineMs: 10000,
} as const;
const answerLabel = z.string().trim().min(1).max(512);
const answerText = z
  .string()
  .min(1)
  .max(65536)
  .refine((value) => value.trim().length > 0, "Text must not be blank");
const uniqueStrings = z
  .array(answerLabel)
  .min(1)
  .max(20)
  .refine((v) => new Set(v).size === v.length, "Duplicate values");
const answerCitationSchema = sourceReferenceSchema.refine(
  (v) => v.lines !== null,
  "Answer citations require line ranges",
);
export const answerBenchmarkSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: answerLabel,
    rubricVersion: answerLabel,
    repositoryId: contentIdentitySchema,
    revisions: z
      .array(gitObjectIdSchema)
      .min(1)
      .max(4)
      .refine((v) => new Set(v).size === v.length, "Duplicate revisions"),
    revisionIdentities: z
      .array(
        z
          .object({
            repositoryId: contentIdentitySchema,
            commitSha: gitObjectIdSchema,
          })
          .strict(),
      )
      .min(1)
      .max(4),
    cases: z
      .array(
        z
          .object({
            id: answerLabel,
            question: answerText,
            kind: z.enum(["current", "history"]),
            requiredPoints: uniqueStrings,
            permittedUncertainty: answerText,
            expectedCitations: z.array(answerCitationSchema).min(1).max(20),
          })
          .strict(),
      )
      .min(1)
      .max(answerEvaluationLimits.cases),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (new Set(v.cases.map((c) => c.id)).size !== v.cases.length)
      ctx.addIssue({ code: "custom", message: "Duplicate question ID" });
    if (
      v.revisionIdentities.length !== v.revisions.length ||
      new Set(v.revisionIdentities.map((r) => r.commitSha)).size !==
        v.revisions.length ||
      v.revisionIdentities.some((r) => !v.revisions.includes(r.commitSha)) ||
      !v.revisionIdentities.some((r) => r.repositoryId === v.repositoryId)
    )
      ctx.addIssue({
        code: "custom",
        message: "Revision identity mapping mismatch",
      });
    for (const c of v.cases) {
      if (
        c.expectedCitations.some(
          (s) =>
            !v.revisionIdentities.some(
              (r) =>
                r.repositoryId === s.repositoryId &&
                r.commitSha === s.commitSha,
            ),
        )
      )
        ctx.addIssue({
          code: "custom",
          message: "Reference identity mismatch",
        });
      if (
        c.kind === "history" &&
        new Set(c.expectedCitations.map((s) => s.commitSha)).size < 2
      )
        ctx.addIssue({
          code: "custom",
          message: "History requires before and after citations",
        });
    }
  });
const answerMetricSchema = z
  .object({
    value: z.number().finite().nonnegative(),
    scope: answerLabel,
    provenance: answerText,
  })
  .strict();
export const answerMetricsSchema = z
  .object({
    elapsedMs: answerMetricSchema.nullable(),
    toolCalls: answerMetricSchema
      .extend({ value: z.number().int().nonnegative() })
      .nullable(),
    bytes: answerMetricSchema
      .extend({ value: z.number().int().nonnegative() })
      .nullable(),
    tokens: answerMetricSchema
      .extend({ value: z.number().int().nonnegative() })
      .nullable(),
    costUsd: answerMetricSchema.nullable(),
  })
  .strict();
export const answerTrialSchema = z
  .object({
    id: answerLabel,
    caseId: answerLabel,
    benchmarkDigest: contentIdentitySchema,
    arm: z.enum(["direct", "retrieval"]),
    repetitionId: answerLabel,
    participant: z
      .object({ kind: z.enum(["human", "model"]), configuration: answerText })
      .strict(),
    revisions: z
      .array(gitObjectIdSchema)
      .min(1)
      .max(4)
      .refine((v) => new Set(v).size === v.length, "Duplicate revisions"),
    budgets: z
      .object({
        contextBytes: z.number().int().positive(),
        outputTokens: z.number().int().positive(),
        timeMs: z.number().int().positive(),
      })
      .strict(),
    provenance: z.enum(["synthetic", "real"]),
    protocolNotes: answerText,
    answer: z
      .object({
        text: answerText,
        citations: z.array(answerCitationSchema).max(20),
      })
      .strict(),
    metrics: answerMetricsSchema,
  })
  .strict();
export const answerTrialsSchema = z
  .object({
    schemaVersion: z.literal(1),
    trials: z.array(answerTrialSchema).max(answerEvaluationLimits.trials),
  })
  .strict()
  .refine(
    (v) => new Set(v.trials.map((t) => t.id)).size === v.trials.length,
    "Duplicate trial ID",
  );
const assessmentDimensionSchema = z
  .object({ outcome: z.enum(["pass", "fail"]), reason: answerText })
  .strict();
export const answerAssessmentSchema = z
  .object({
    trialId: answerLabel,
    reviewerId: answerLabel,
    benchmarkDigest: contentIdentitySchema,
    answerDigest: contentIdentitySchema,
    rubricVersion: answerLabel,
    correctness: assessmentDimensionSchema,
    citationSupport: assessmentDimensionSchema,
    uncertainty: assessmentDimensionSchema,
  })
  .strict();
export const answerAssessmentsSchema = z
  .object({
    schemaVersion: z.literal(1),
    assessments: z
      .array(answerAssessmentSchema)
      .max(answerEvaluationLimits.trials),
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.assessments.map((a) => a.trialId)).size ===
      v.assessments.length,
    "Duplicate assessment",
  );
export const answerEvidenceManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    artifacts: z
      .array(
        z
          .object({
            snapshot: answerText,
            bundle: answerText.nullable(),
            snapshotIdentity: contentIdentitySchema,
            bundleIdentity: contentIdentitySchema.nullable(),
          })
          .strict()
          .refine(
            (v) => (v.bundle === null) === (v.bundleIdentity === null),
            "Bundle identity required",
          ),
      )
      .min(1)
      .max(4),
  })
  .strict();
const citationFindingSchema = z
  .object({
    source: answerCitationSchema,
    available: z.boolean(),
    reasons: z.array(answerLabel).max(40),
  })
  .strict();
const metricDifferenceSchema = z
  .object({
    direct: z.number().nonnegative().nullable(),
    retrieval: z.number().nonnegative().nullable(),
    difference: z.number().nullable(),
    reason: answerLabel.nullable(),
    scope: answerLabel.nullable(),
  })
  .strict();
export const answerComparisonReportSchema = z
  .object({
    schemaVersion: z.literal(1),
    benchmarkDigest: contentIdentitySchema,
    benchmark: answerBenchmarkSchema,
    evidence: z
      .array(
        z
          .object({
            repositoryId: contentIdentitySchema,
            revision: gitObjectIdSchema,
            snapshotIdentity: contentIdentitySchema,
            bundleIdentity: contentIdentitySchema.nullable(),
          })
          .strict(),
      )
      .max(4),
    cases: z
      .array(
        z
          .object({
            id: answerLabel,
            available: z.boolean(),
            findings: z.array(citationFindingSchema).max(20),
          })
          .strict(),
      )
      .max(20),
    trials: z
      .array(
        z
          .object({
            trial: answerTrialSchema,
            answerDigest: contentIdentitySchema,
            assessment: answerAssessmentSchema.nullable(),
            quality: z.enum(["pass", "fail", "unreviewed", "unavailable"]),
            findings: z.array(citationFindingSchema).max(20),
          })
          .strict(),
      )
      .max(100),
    pairs: z
      .array(
        z
          .object({
            directId: answerLabel.nullable(),
            retrievalId: answerLabel.nullable(),
            eligible: z.boolean(),
            reasons: z.array(answerLabel).max(20),
            metrics: z
              .object({
                elapsedMs: metricDifferenceSchema,
                toolCalls: metricDifferenceSchema,
                bytes: metricDifferenceSchema,
                tokens: metricDifferenceSchema,
                costUsd: metricDifferenceSchema,
              })
              .strict(),
          })
          .strict(),
      )
      .max(100),
    counts: z
      .object({
        trials: z.number().int().nonnegative(),
        pairs: z.number().int().nonnegative(),
        eligiblePairs: z.number().int().nonnegative(),
        unpairedTrials: z.number().int().nonnegative(),
      })
      .strict(),
    limitations: z.array(answerText).min(1).max(20),
  })
  .strict();
export type AnswerBenchmark = z.infer<typeof answerBenchmarkSchema>;
export type AnswerTrial = z.infer<typeof answerTrialSchema>;
export type AnswerAssessment = z.infer<typeof answerAssessmentSchema>;
export type AnswerComparisonReport = z.infer<
  typeof answerComparisonReportSchema
>;
