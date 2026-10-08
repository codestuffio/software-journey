import {
  capturedLines,
  type DiscoveryResponse,
  discoveryRequestSchema,
  discoveryResponseSchema,
  type EvidenceDescriptor,
  type EvidenceInputs,
  type EvidenceResponse,
  type EvidenceSelector,
  type LineRange,
  type Omission,
  type RetrievalItem,
  type RetrievalResponse,
  retrievalRequestSchema,
  retrievalResponseSchema,
  type WorkflowBundle,
} from "@software-journey/contracts";

export type { EvidenceInputs } from "@software-journey/contracts";

type Evidence = WorkflowBundle["steps"][number]["evidence"];
interface Entry {
  descriptor: EvidenceDescriptor;
  evidence: Evidence;
}
const encoder = new TextEncoder();
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
async function checkpoint(signal?: AbortSignal) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  signal?.throwIfAborted();
}

async function entries(
  inputs: EvidenceInputs,
  signal?: AbortSignal,
): Promise<Entry[]> {
  if (inputs.sources !== undefined)
    throw new Error("Selected-source retrieval is not implemented");
  const result: Entry[] = [];
  for (const [index, extract] of inputs.snapshot.documentation.entries()) {
    result.push({
      descriptor: {
        id: `documentation:${extract.contentId}:${index}`,
        origin: "documentation",
        status: "available",
        reasons: [],
        selector: {
          type: "source",
          repositoryId: extract.source.repositoryId,
          commitSha: extract.source.commitSha,
          path: extract.source.path,
          ...(extract.source.lines ? { lines: extract.source.lines } : {}),
        },
        source: extract.source,
        commitSha: null,
        label: null,
      },
      evidence: { type: "source", ...extract },
    });
    if (index % 32 === 0) await checkpoint(signal);
  }
  for (const step of inputs.bundle?.steps ?? []) {
    const evidence = step.evidence;
    result.push({
      descriptor: {
        id: `workflow:${step.id}`,
        origin: "workflow",
        status: evidence.type === "unavailable" ? "unavailable" : "available",
        reasons: evidence.type === "unavailable" ? [evidence.reason] : [],
        selector: {
          type: "step",
          workflowId: inputs.bundle?.workflow.id ?? "",
          stepId: step.id,
        },
        source: evidence.type === "source" ? evidence.source : null,
        commitSha: evidence.type === "history" ? evidence.commit.sha : null,
        label: step.label,
      },
      evidence,
    });
  }
  result.sort((a, b) => compare(a.descriptor.id, b.descriptor.id));
  await checkpoint(signal);
  return result;
}
function allOmissions(inputs: EvidenceInputs): Omission[] {
  return [
    ...inputs.snapshot.coverage.omissions,
    ...(inputs.bundle?.omissions ?? []),
  ];
}
function relevantOmissions(inputs: EvidenceInputs, path?: string) {
  return allOmissions(inputs).filter(
    (item) => path === undefined || item.path === null || item.path === path,
  );
}
function base(inputs: EvidenceInputs, maxBytes: number, omissions: Omission[]) {
  return {
    schemaVersion: 1 as const,
    repository: inputs.snapshot.repository,
    inputs: {
      snapshot: inputs.snapshot.contentIdentity,
      bundle: inputs.bundle?.contentIdentity ?? null,
    },
    status: "available" as const,
    reasons: [] as string[],
    coverage: {
      ...inputs.snapshot.coverage,
      omissions: [] as Omission[],
      workflowSteps: inputs.bundle?.steps.length ?? 0,
      totalOmissions: allOmissions(inputs).length,
      relevantOmissions: omissions.length,
      omittedDetails: omissions.length,
    },
    budget: { maxBytes, returnedBytes: 0, omittedItems: 0, omittedLines: 0 },
  };
}

/** Include byte accounting in its own fixed point, plus the trailing newline. */
export function serializeEvidenceResponse(response: EvidenceResponse): string {
  let output = "";
  for (let attempt = 0; attempt < 8; attempt++) {
    output = `${JSON.stringify(response)}\n`;
    const bytes = encoder.encode(output).length;
    if (bytes === response.budget.returnedBytes) return output;
    response.budget.returnedBytes = bytes;
  }
  throw new Error("Response byte accounting did not converge");
}
function updateStatus(response: EvidenceResponse) {
  const reasons = new Set(
    response.reasons.filter(
      (reason) =>
        reason !== "response-budget" && reason !== "collection-limited",
    ),
  );
  const limited =
    response.coverage.relevantOmissions > 0 ||
    response.coverage.history.completeness !== "complete";
  if (limited) reasons.add("collection-limited");
  if (response.budget.omittedItems > 0 || response.budget.omittedLines > 0)
    reasons.add("response-budget");
  response.reasons = [...reasons];
  if (response.kind === "retrieval") {
    const hasEvidence = response.items.some(
      (item) => item.type !== "unavailable",
    );
    response.status = !hasEvidence
      ? "unavailable"
      : limited ||
          reasons.size > 0 ||
          response.items.some((item) => item.status !== "available")
        ? "partial"
        : "available";
  } else {
    response.status =
      limited ||
      reasons.size > 0 ||
      response.items.some((item) => item.status !== "available")
        ? "partial"
        : "available";
  }
}
function fits(response: EvidenceResponse) {
  updateStatus(response);
  return (
    encoder.encode(serializeEvidenceResponse(response)).length <=
    response.budget.maxBytes
  );
}
function requireEnvelope(response: EvidenceResponse) {
  if (!fits(response))
    throw new Error("budget-too-small: required metadata cannot fit");
}
async function addOmissionDetails(
  response: EvidenceResponse,
  omissions: Omission[],
  signal?: AbortSignal,
) {
  for (const [index, omission] of omissions.entries()) {
    response.coverage.omissions.push(omission);
    response.coverage.omittedDetails--;
    if (!fits(response)) {
      response.coverage.omissions.pop();
      response.coverage.omittedDetails++;
      break;
    }
    if (index % 32 === 0) await checkpoint(signal);
  }
  requireEnvelope(response);
}

export async function discoverEvidence(
  inputs: EvidenceInputs,
  requestValue: unknown = {},
  signal?: AbortSignal,
): Promise<DiscoveryResponse> {
  signal?.throwIfAborted();
  const request = discoveryRequestSchema.parse(requestValue);
  const list = await entries(inputs, signal);
  const omissions = relevantOmissions(inputs);
  const response: DiscoveryResponse = {
    ...base(inputs, request.maxBytes, omissions),
    kind: "discovery",
    offset: request.offset,
    totalItems: list.length,
    nextOffset: null,
    items: [],
  };
  response.budget.omittedItems = Math.max(0, list.length - request.offset);
  requireEnvelope(response);
  for (let index = request.offset; index < list.length; index++) {
    const entry = list[index];
    if (!entry) continue;
    response.items.push(entry.descriptor);
    response.budget.omittedItems--;
    response.nextOffset = index + 1 < list.length ? index + 1 : null;
    if (!fits(response)) {
      response.items.pop();
      response.budget.omittedItems++;
      response.nextOffset = index;
      if (response.items.length === 0)
        throw new Error("budget-too-small: discovery descriptor cannot fit");
      break;
    }
    if (index % 32 === 0) await checkpoint(signal);
  }
  await addOmissionDetails(response, omissions, signal);
  await checkpoint(signal);
  return discoveryResponseSchema.parse(response);
}

function missingRanges(
  requested: LineRange,
  returned: LineRange | null,
): LineRange[] {
  if (!returned) return [requested];
  const missing: LineRange[] = [];
  if (requested.start < returned.start)
    missing.push({ start: requested.start, end: returned.start - 1 });
  if (requested.end > returned.end)
    missing.push({ start: returned.end + 1, end: requested.end });
  return missing;
}
function collectionTruncated(inputs: EvidenceInputs, path: string) {
  return allOmissions(inputs).some(
    (item) =>
      (item.path === path || item.path === null) &&
      ["per-file-byte-limit", "total-byte-limit"].includes(item.reason),
  );
}
function selectItem(
  entry: Entry,
  selector: EvidenceSelector,
  inputs: EvidenceInputs,
): RetrievalItem {
  const base = {
    id: entry.descriptor.id,
    origin: entry.descriptor.origin,
    status: "available" as const,
    reasons: [] as string[],
  };
  const evidence = entry.evidence;
  if (evidence.type === "unavailable")
    return {
      ...base,
      type: "unavailable",
      status: "unavailable",
      reasons: [evidence.reason],
      missingRanges: selector.lines ? [selector.lines] : [],
    };
  if (evidence.type === "history") {
    if (selector.lines)
      throw new Error("History steps do not support line ranges");
    return { ...base, type: "history", commit: evidence.commit };
  }
  const truncated = collectionTruncated(inputs, evidence.source.path);
  const lines = capturedLines(evidence.text);
  const uncertainLast = truncated && !evidence.text.endsWith("\n");
  const range = evidence.source.lines;
  if (!selector.lines)
    return {
      ...base,
      ...evidence,
      status: truncated ? "partial" : "available",
      reasons: truncated ? ["collection-truncated"] : [],
      missingRanges: [],
      omittedLines: 0,
    };
  if (!range)
    return {
      ...base,
      type: "unavailable",
      status: "unavailable",
      reasons: ["line-range-unknown"],
      missingRanges: [selector.lines],
    };
  const start = Math.max(range.start, selector.lines.start);
  const end = Math.min(range.end - (uncertainLast ? 1 : 0), selector.lines.end);
  if (start > end)
    return {
      ...base,
      type: "unavailable",
      status: "unavailable",
      reasons: ["range-not-captured"],
      missingRanges: [selector.lines],
    };
  const text = lines.slice(start - range.start, end - range.start + 1).join("");
  // A terminal empty line is a valid recorded line but has no source bytes to return.
  if (text.length === 0)
    return {
      ...base,
      type: "unavailable",
      status: "unavailable",
      reasons: ["empty-range"],
      missingRanges: [selector.lines],
    };
  const missing = missingRanges(selector.lines, { start, end });
  return {
    ...base,
    ...evidence,
    source: { ...evidence.source, lines: { start, end } },
    text,
    status: missing.length || truncated ? "partial" : "available",
    reasons: [
      ...(missing.length ? ["range-not-captured"] : []),
      ...(truncated ? ["collection-truncated"] : []),
    ],
    missingRanges: missing,
    omittedLines: 0,
  };
}

function sourceLines(
  item: Extract<RetrievalItem, { type: "source" }>,
): string[] {
  const lines = capturedLines(item.text);
  const range = item.source.lines;
  return range ? lines.slice(0, range.end - range.start + 1) : lines;
}

function linePrefix(
  item: Extract<RetrievalItem, { type: "source" }>,
  count: number,
  lines: string[],
): RetrievalItem {
  const original = item.source.lines;
  const returned = original
    ? { start: original.start, end: original.start + count - 1 }
    : null;
  return {
    ...item,
    text: lines.slice(0, count).join(""),
    source: { ...item.source, lines: returned },
    status: "partial",
    reasons: [...item.reasons, "response-budget"],
    omittedLines: lines.length - count,
    missingRanges: [
      ...item.missingRanges,
      ...(original && returned && returned.end < original.end
        ? [{ start: returned.end + 1, end: original.end }]
        : []),
    ],
  };
}

export async function retrieveEvidence(
  inputs: EvidenceInputs,
  requestValue: unknown,
  signal?: AbortSignal,
): Promise<RetrievalResponse> {
  signal?.throwIfAborted();
  const request = retrievalRequestSchema.parse(requestValue);
  const { selector } = request;
  if (
    selector.type === "source" &&
    (selector.repositoryId !== inputs.snapshot.repository.id ||
      selector.commitSha !== inputs.snapshot.repository.headCommit)
  ) {
    throw new Error("Requested source identity mismatch");
  }
  const list = (await entries(inputs, signal)).filter((entry) =>
    selector.type === "step"
      ? inputs.bundle?.workflow.id === selector.workflowId &&
        entry.descriptor.selector.type === "step" &&
        entry.descriptor.selector.stepId === selector.stepId
      : entry.descriptor.source?.path === selector.path,
  );
  const path =
    selector.type === "step" ? list[0]?.descriptor.source?.path : selector.path;
  const omissions = relevantOmissions(inputs, path);
  const response: RetrievalResponse = {
    ...base(inputs, request.maxBytes, omissions),
    kind: "retrieval",
    selector,
    items: [],
  };
  response.budget.omittedItems = list.length;
  if (list.length === 0) {
    response.reasons.push(
      selector.type === "step"
        ? "unknown-step"
        : inputs.snapshot.inventory.some((item) => item.path === selector.path)
          ? "not-captured"
          : "unknown-path",
    );
  }
  const selected: RetrievalItem[] = [];
  for (const [index, entry] of list.entries()) {
    selected.push(selectItem(entry, selector, inputs));
    if (index % 32 === 0) await checkpoint(signal);
  }
  const lineCount = (item: RetrievalItem) =>
    item.type === "source" ? sourceLines(item).length : 0;
  response.budget.omittedLines = selected.reduce(
    (sum, item) => sum + lineCount(item),
    0,
  );
  requireEnvelope(response);
  for (const [index, item] of selected.entries()) {
    const remainingLines = response.budget.omittedLines;
    response.budget.omittedLines -= lineCount(item);
    response.items.push(item);
    response.budget.omittedItems--;
    if (!fits(response)) {
      response.items.pop();
      response.budget.omittedItems++;
      response.budget.omittedLines = remainingLines;
      if (item.type === "source") {
        const lines = sourceLines(item);
        // Collection-truncated boundary lines must not become budget-truncated complete lines.
        let high =
          lines.length -
          (collectionTruncated(inputs, item.source.path) &&
          !item.text.endsWith("\n")
            ? 1
            : 0);
        let low = 1;
        let best: RetrievalItem | undefined;
        while (low <= high) {
          const middle = Math.floor((low + high) / 2);
          const candidate = linePrefix(item, middle, lines);
          response.items.push(candidate);
          response.budget.omittedItems--;
          response.budget.omittedLines = remainingLines - middle;
          const accepted = fits(response);
          response.items.pop();
          response.budget.omittedItems++;
          if (accepted) {
            best = candidate;
            low = middle + 1;
          } else high = middle - 1;
          await checkpoint(signal);
        }
        if (best) {
          response.items.push(best);
          response.budget.omittedItems--;
          response.budget.omittedLines =
            remainingLines -
            lines.length +
            (best.type === "source" ? best.omittedLines : 0);
        } else response.budget.omittedLines = remainingLines;
      }
      break;
    }
    if (index % 32 === 0) await checkpoint(signal);
  }
  await addOmissionDetails(response, omissions, signal);
  await checkpoint(signal);
  return retrievalResponseSchema.parse(response);
}

export {
  answerContentDigest,
  canonicalAnswerJson,
  compareAnswers,
} from "./answer-evaluation.js";
export { buildGuidedLesson, lessonCatalog, lessonTarget } from "./lesson.js";
