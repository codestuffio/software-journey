import { expect, test } from "vitest";
import {
  type EvidenceResponse,
  sourceCaptureContentIdentity,
  sourceTextDigest,
  validateRetrievalInputs,
} from "../packages/contracts/src/index.ts";
import {
  discoverEvidence,
  retrieveEvidence,
  serializeEvidenceResponse,
} from "../packages/knowledge/src/index.ts";
import {
  evidenceFixture,
  pathRequest,
  required,
} from "./fixtures/retrieval.ts";
import { sourcesFixture } from "./fixtures/source-capture.ts";

function checkBudget(response: EvidenceResponse) {
  const output = serializeEvidenceResponse(response);
  expect(Buffer.byteLength(output)).toBe(response.budget.returnedBytes);
  expect(Buffer.byteLength(output)).toBeLessThanOrEqual(
    response.budget.maxBytes,
  );
  expect(JSON.parse(output)).toEqual(response);
}
async function inputFixture() {
  const input = evidenceFixture();
  const sources = await sourcesFixture();
  return { ...input, sources };
}
const ranged = (
  path: string,
  start: number,
  end: number,
  maxBytes = 32768,
) => ({
  ...pathRequest(path, maxBytes),
  selector: { type: "path", path, lines: { start, end } },
});

test("source captures keep documentation and workflow origins separate", async () => {
  const input = await inputFixture();
  const entry = required(input.sources.entries[0]);
  entry.selection = { path: "README.md", lines: { start: 11, end: 11 } };
  entry.actualRange = entry.selection.lines;
  entry.fileLineCount = 20;
  entry.text = "selected\r\n";
  entry.contentDigest = await sourceTextDigest(entry.text);
  input.sources.selections = [entry.selection];
  required(input.sources.blobs[0]).bytesRead = 100;
  input.sources.coverage.bytesRead = 100;
  input.sources.coverage.bytesReturned = Buffer.byteLength(entry.text);
  input.sources.contentIdentity = await sourceCaptureContentIdentity(
    input.sources,
  );
  input.snapshot.coverage.omissions.push({
    path: "README.md",
    reason: "per-file-byte-limit",
    detail: "Documentation only",
  });
  const validated = await validateRetrievalInputs(
    input.snapshot,
    input.bundle,
    undefined,
    input.sources,
  );
  const response = await retrieveEvidence(
    validated,
    ranged("README.md", 11, 11),
  );
  expect(response.items.map((item) => item.origin)).toEqual([
    "documentation",
    "selected-source",
    "workflow",
  ]);
  expect(response.items[1]).toMatchObject({
    status: "available",
    text: "selected\r\n",
    reasons: [],
    missingRanges: [],
  });
  expect(
    response.items
      .filter((item) => item.origin !== "selected-source")
      .every((item) => item.reasons.includes("collection-truncated")),
  ).toBe(true);
  const step = await retrieveEvidence(validated, {
    schemaVersion: 1,
    selector: { type: "step", workflowId: "example", stepId: "source" },
  });
  expect(step.items.map((item) => item.origin)).toEqual(["workflow"]);
  checkBudget(response);
});

test("partial and unavailable selections expose their reasons and requested gaps", async () => {
  const input = await inputFixture();
  const partial = required(input.sources.entries[0]);
  partial.actualRange = { ...required(partial.actualRange) };
  partial.selection.lines.end = 3;
  partial.status = "partial";
  partial.missingRanges = [{ start: 2, end: 3 }];
  partial.reasons = ["text-byte-limit", "range-beyond-eof"];
  const unavailable = {
    selection: { path: "absent.ts", lines: { start: 10, end: 20 } },
    status: "unavailable" as const,
    blobId: null,
    fileLineCount: null,
    actualRange: null,
    text: null,
    contentDigest: null,
    missingRanges: [{ start: 10, end: 20 }],
    reasons: ["missing-path" as const],
  };
  input.sources.entries.unshift(unavailable);
  input.sources.selections = input.sources.entries.map(
    (entry) => entry.selection,
  );
  input.sources.coverage.requestedSelections = 2;
  input.sources.coverage.partialSelections = 1;
  input.sources.coverage.unavailableSelections = 1;
  input.sources.contentIdentity = await sourceCaptureContentIdentity(
    input.sources,
  );
  const validated = await validateRetrievalInputs(
    input.snapshot,
    undefined,
    undefined,
    input.sources,
  );
  const discovery = await discoverEvidence(validated);
  expect(discovery.coverage.selectedSources).toEqual(input.sources.coverage);
  expect(
    discovery.items
      .filter((item) => item.origin === "selected-source")
      .map((item) => [item.status, item.reasons]),
  ).toEqual([
    ["unavailable", ["missing-path"]],
    ["partial", ["text-byte-limit", "range-beyond-eof"]],
  ]);
  const whole = await retrieveEvidence(
    validated,
    pathRequest("src/example.ts"),
  );
  expect(whole.items[0]).toMatchObject({
    status: "partial",
    missingRanges: [{ start: 2, end: 3 }],
    reasons: partial.reasons,
  });
  const overlap = await retrieveEvidence(
    validated,
    ranged("src/example.ts", 1, 2),
  );
  expect(overlap.items[0]).toMatchObject({
    status: "partial",
    source: { lines: { start: 1, end: 1 } },
    missingRanges: [{ start: 2, end: 2 }],
    reasons: expect.arrayContaining(partial.reasons),
  });
  const outside = await retrieveEvidence(
    validated,
    ranged("src/example.ts", 30, 40),
  );
  expect(outside.items[0]).toMatchObject({
    type: "unavailable",
    missingRanges: [{ start: 30, end: 40 }],
    reasons: expect.arrayContaining(["range-not-captured", ...partial.reasons]),
  });
  const absent = await retrieveEvidence(validated, pathRequest("absent.ts"));
  expect(absent.items[0]).toMatchObject({
    type: "unavailable",
    reasons: ["missing-path"],
    missingRanges: [{ start: 10, end: 20 }],
  });
  for (const descriptor of discovery.items.filter(
    (item) => item.origin === "selected-source",
  )) {
    const roundTrip = await retrieveEvidence(validated, {
      schemaVersion: 1,
      selector: descriptor.selector,
    });
    expect(roundTrip.items).toHaveLength(1);
    expect(roundTrip.items[0]).toMatchObject({
      id: descriptor.id,
      status: descriptor.status,
      reasons: expect.arrayContaining(descriptor.reasons),
      sourcesIdentity: input.sources.contentIdentity,
      missingRanges:
        descriptor.status === "partial"
          ? [{ start: 2, end: 3 }]
          : [{ start: 10, end: 20 }],
    });
    checkBudget(roundTrip);
  }
  for (const response of [discovery, whole, overlap, outside, absent])
    checkBudget(response);
});

test.each(["", "last unterminated", "first\n"])(
  "complete source lines survive exact retrieval: %j",
  async (text) => {
    const input = await inputFixture();
    const entry = required(input.sources.entries[0]);
    entry.selection.lines = { start: 1, end: text.split("\n").length };
    entry.actualRange = entry.selection.lines;
    entry.fileLineCount = entry.selection.lines.end;
    entry.text = text;
    entry.contentDigest = await sourceTextDigest(text);
    input.sources.selections = [entry.selection];
    required(input.sources.blobs[0]).bytesRead = Buffer.byteLength(text);
    input.sources.coverage.bytesRead = Buffer.byteLength(text);
    input.sources.coverage.bytesReturned = Buffer.byteLength(text);
    input.sources.contentIdentity = await sourceCaptureContentIdentity(
      input.sources,
    );
    const validated = await validateRetrievalInputs(
      input.snapshot,
      undefined,
      undefined,
      input.sources,
    );
    const response = await retrieveEvidence(
      validated,
      ranged(
        entry.selection.path,
        entry.selection.lines.end,
        entry.selection.lines.end,
      ),
    );
    expect(response.items[0]).toMatchObject({
      type: "source",
      status: "available",
      text: text.endsWith("\n") ? "" : text,
      missingRanges: [],
    });
    checkBudget(response);
  },
);

test("source response budgets trim complete Unicode lines and discovery paginates stably", async () => {
  const input = await inputFixture();
  const entry = required(input.sources.entries[0]);
  entry.text = '😀 "quoted" \\ slash\r\n'.repeat(400);
  entry.selection.lines = { start: 1, end: 400 };
  entry.actualRange = entry.selection.lines;
  entry.fileLineCount = 401;
  entry.contentDigest = await sourceTextDigest(entry.text);
  required(input.sources.blobs[0]).bytesRead = Buffer.byteLength(entry.text);
  input.sources.entries = Array.from({ length: 16 }, (_, i) => ({
    ...structuredClone(entry),
    selection: {
      path: `src/${String(i).padStart(2, "0")}.ts`,
      lines: entry.selection.lines,
    },
  }));
  input.sources.selections = input.sources.entries.map(
    (entry) => entry.selection,
  );
  input.sources.coverage = {
    requestedSelections: 16,
    capturedSelections: 16,
    partialSelections: 0,
    unavailableSelections: 0,
    bytesRead: Buffer.byteLength(entry.text),
    bytesReturned: 16 * Buffer.byteLength(entry.text),
  };
  input.sources.contentIdentity = await sourceCaptureContentIdentity(
    input.sources,
  );
  const validated = await validateRetrievalInputs(
    input.snapshot,
    input.bundle,
    undefined,
    input.sources,
  );
  const response = await retrieveEvidence(
    validated,
    pathRequest("src/00.ts", 4096),
  );
  const returned = required(response.items[0]);
  expect(returned.type).toBe("source");
  if (returned.type === "source") {
    expect(returned.text.endsWith("\r\n")).toBe(true);
    expect(returned.text).not.toContain("�");
    expect(returned.source.lines?.end).toBe(
      returned.text.split("\n").length - 1,
    );
    expect(returned.omittedLines).toBe(
      400 - required(returned.source.lines).end,
    );
  }
  checkBudget(response);
  const ids: string[] = [];
  let offset = 0;
  do {
    const page = await discoverEvidence(validated, { offset, maxBytes: 4096 });
    expect(page.items.every((item) => !("text" in item))).toBe(true);
    ids.push(...page.items.map((item) => item.id));
    checkBudget(page);
    if (page.nextOffset === null) break;
    expect(page.nextOffset).toBeGreaterThan(offset);
    offset = page.nextOffset;
  } while (offset < 100);
  expect(ids).toHaveLength(19);
  expect(new Set(ids).size).toBe(19);
  expect(ids).toEqual(
    (await discoverEvidence(validated)).items.map((item) => item.id),
  );
});

test("adjacent captures stay separate and cannot satisfy an uncaptured complete range", async () => {
  const input = await inputFixture();
  const entry = required(input.sources.entries[0]);
  entry.selection.path = "same.ts";
  entry.fileLineCount = 3;
  const second = structuredClone(entry);
  second.selection.lines = { start: 2, end: 2 };
  second.actualRange = second.selection.lines;
  input.sources.entries.push(second);
  input.sources.selections = input.sources.entries.map(
    (entry) => entry.selection,
  );
  required(input.sources.blobs[0]).bytesRead = 12;
  input.sources.coverage.requestedSelections = 2;
  input.sources.coverage.capturedSelections = 2;
  input.sources.coverage.bytesRead = 12;
  input.sources.coverage.bytesReturned = 12;
  input.sources.contentIdentity = await sourceCaptureContentIdentity(
    input.sources,
  );
  const validated = await validateRetrievalInputs(
    input.snapshot,
    undefined,
    undefined,
    input.sources,
  );
  const response = await retrieveEvidence(validated, ranged("same.ts", 1, 2));
  expect(response.items).toHaveLength(2);
  expect(response.items.every((item) => item.status === "partial")).toBe(true);
  expect(
    response.items.map((item) =>
      item.type === "source" ? item.missingRanges : [],
    ),
  ).toEqual([[{ start: 2, end: 2 }], [{ start: 1, end: 1 }]]);
});

test("sidecar retrieval yields for cancellation", async () => {
  const input = await inputFixture();
  const controller = new AbortController();
  const pending = retrieveEvidence(
    input,
    pathRequest("src/example.ts"),
    controller.signal,
  );
  controller.abort(new Error("canceled"));
  await expect(pending).rejects.toThrow("canceled");
});
