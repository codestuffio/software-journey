import {
  type EvaluationCase,
  type RetrievalEvaluation,
  type RetrievalRequest,
  type RetrievalResponse,
  retrievalEvaluationSchema,
  retrievalLimits,
  retrievalRequestSchema,
  retrievalResponseSchema,
  snapshotSchema,
} from "@software-journey/contracts";

function matchesPath(
  path: string | null,
  filter: RetrievalRequest["filter"],
): boolean {
  if (path === null) return true;
  if (filter.path !== null && path !== filter.path) return false;
  return (
    filter.area === null ||
    path === filter.area ||
    path.startsWith(`${filter.area}/`)
  );
}

/** Runs fixed evidence questions through the same bounded retrieval contract. */
export function evaluateRetrievalCases(
  snapshotValue: unknown,
  catalogId: string,
  cases: readonly EvaluationCase[],
): RetrievalEvaluation {
  const snapshot = snapshotSchema.parse(snapshotValue);
  const results = cases.map((item) => {
    const response = retrieveSnapshot(snapshot, {
      schemaVersion: 1,
      repository: snapshot.repository,
      snapshotContentIdentity: snapshot.contentIdentity,
      filter: { area: null, path: item.expectedSource.path },
      limits: {
        maximumEvidence: retrievalLimits.maximumEvidence,
        maximumCharactersPerEvidence:
          retrievalLimits.maximumCharactersPerEvidence,
      },
    });
    const evidence = response.evidence.find(
      (entry) =>
        entry.source.path === item.expectedSource.path &&
        entry.source.repositoryId === item.expectedSource.repositoryId &&
        entry.source.commitSha === item.expectedSource.commitSha,
    );
    return {
      caseId: item.id,
      status: evidence ? "resolved" : "unavailable",
      expectedSource: item.expectedSource,
      observedSource: evidence?.source ?? null,
      coverage: response.coverage,
    };
  });
  return retrievalEvaluationSchema.parse({
    schemaVersion: 1,
    snapshot: {
      contentIdentity: snapshot.contentIdentity,
      repository: snapshot.repository,
    },
    catalogId,
    results,
  });
}

/** Retrieves only evidence already captured in a validated local snapshot. */
export function retrieveSnapshot(
  snapshotValue: unknown,
  requestValue: unknown,
): RetrievalResponse {
  const snapshot = snapshotSchema.parse(snapshotValue);
  const request = retrievalRequestSchema.parse(requestValue);
  if (
    request.repository.id !== snapshot.repository.id ||
    request.repository.headCommit !== snapshot.repository.headCommit ||
    request.snapshotContentIdentity !== snapshot.contentIdentity
  ) {
    throw new Error(
      "Retrieval request does not match the snapshot identity and revision.",
    );
  }

  const inventory = snapshot.inventory.filter((entry) =>
    matchesPath(entry.path, request.filter),
  );
  const extracts = snapshot.documentation.filter((entry) =>
    matchesPath(entry.source.path, request.filter),
  );
  const selected = extracts.slice(0, request.limits.maximumEvidence);
  const evidence = selected.map((entry) => {
    const textTruncated =
      entry.text.length > request.limits.maximumCharactersPerEvidence;
    const text = entry.text.slice(
      0,
      request.limits.maximumCharactersPerEvidence,
    );
    const start = entry.source.lines?.start ?? 1;
    return {
      ...entry,
      text,
      textTruncated,
      source: {
        ...entry.source,
        lines: { start, end: start + text.split("\n").length - 1 },
      },
    };
  });
  const omissions = snapshot.coverage.omissions.filter((item) =>
    matchesPath(item.path, request.filter),
  );
  const extractPaths = new Set(extracts.map((entry) => entry.source.path));
  const unavailableInventoryEntries = inventory.filter(
    (entry) => !extractPaths.has(entry.path),
  ).length;
  const omittedByResultLimit = extracts.length - selected.length;
  return retrievalResponseSchema.parse({
    schemaVersion: 1,
    snapshot: {
      contentIdentity: snapshot.contentIdentity,
      repository: snapshot.repository,
    },
    request,
    evidence,
    coverage: {
      matchingInventoryEntries: inventory.length,
      matchingExtracts: extracts.length,
      returnedExtracts: evidence.length,
      unavailableInventoryEntries,
      omittedByResultLimit,
      matchingSnapshotOmissions: omissions.length,
      unreportedOmissions: Math.max(
        0,
        omissions.length - retrievalLimits.maximumReportedOmissions,
      ),
      resultTruncated:
        omittedByResultLimit > 0 || evidence.some((item) => item.textTruncated),
      snapshotCoverage: {
        inventory: snapshot.coverage.inventory,
        documentation: snapshot.coverage.documentation,
        history: snapshot.coverage.history,
      },
    },
    omissions: omissions.slice(0, retrievalLimits.maximumReportedOmissions),
  });
}
