import { expect, test } from "vitest";
import {
  type EvidenceResponse,
  retrievalRequestSchema,
  validateRetrievalInputs,
} from "../packages/contracts/src/index.ts";
import {
  discoverEvidence,
  retrieveEvidence,
  serializeEvidenceResponse,
} from "../packages/knowledge/src/index.ts";
import {
  evidenceFixture,
  identity,
  pathRequest,
  required,
  sha,
} from "./fixtures/retrieval.ts";

function checkBudget(response: EvidenceResponse) {
  const output = serializeEvidenceResponse(response);
  expect(Buffer.byteLength(output)).toBe(response.budget.returnedBytes);
  expect(Buffer.byteLength(output)).toBeLessThanOrEqual(
    response.budget.maxBytes,
  );
  expect(JSON.parse(output)).toEqual(response);
}
test("requests reject conflicting selectors, versions, ranges, and budgets", () => {
  expect(
    retrievalRequestSchema.parse({
      schemaVersion: 1,
      selector: { type: "path", path: "README.md" },
    }).maxBytes,
  ).toBe(32768);
  for (const request of [
    { ...pathRequest(), schemaVersion: 2 },
    { ...pathRequest(), maxBytes: 4095 },
    { ...pathRequest(), maxBytes: 262145 },
    {
      ...pathRequest(),
      selector: { type: "path", path: "README.md", stepId: "extra" },
    },
    {
      ...pathRequest(),
      selector: {
        type: "path",
        path: "README.md",
        lines: { start: 3, end: 2 },
      },
    },
    {
      ...pathRequest(),
      selector: {
        type: "path",
        path: "README.md",
        lines: { start: 0, end: 2 },
      },
    },
  ])
    expect(retrievalRequestSchema.safeParse(request).success).toBe(false);
});
test("input validation rejects identity mismatches, duplicate steps, and inconsistent spans", async () => {
  const input = evidenceFixture();
  await expect(
    validateRetrievalInputs(input.snapshot, input.bundle),
  ).resolves.toEqual(input);
  const variants = [
    (v: ReturnType<typeof evidenceFixture>) => {
      v.bundle.snapshot.contentIdentity = `sha256:${"d".repeat(64)}`;
    },
    (v: ReturnType<typeof evidenceFixture>) => {
      required(v.snapshot.documentation[0]).source.commitSha = "f".repeat(40);
    },
    (v: ReturnType<typeof evidenceFixture>) => {
      v.bundle.steps.push(required(v.bundle.steps[0]));
    },
    (v: ReturnType<typeof evidenceFixture>) => {
      required(required(v.snapshot.documentation[0]).source.lines).end++;
    },
  ];
  for (const change of variants) {
    const value = structuredClone(input);
    change(value);
    await expect(
      validateRetrievalInputs(value.snapshot, value.bundle),
    ).rejects.toThrow();
  }
});
test("discovery exposes selectors and counts without source bodies and paginates stably", async () => {
  const input = evidenceFixture();
  input.snapshot.documentation = Array.from({ length: 30 }, (_, i) => ({
    ...required(input.snapshot.documentation[0]),
    contentId: `sha256:${i.toString(16).padStart(64, "0")}`,
  }));
  const ids: string[] = [];
  let offset = 0;
  do {
    const page = await discoverEvidence(input, { maxBytes: 4096, offset });
    checkBudget(page);
    expect(page.items.every((item) => !("text" in item))).toBe(true);
    ids.push(...page.items.map((item) => item.id));
    if (page.nextOffset === null) break;
    expect(page.nextOffset).toBeGreaterThan(offset);
    offset = page.nextOffset;
  } while (offset < 100);
  expect(ids).toHaveLength(32);
  expect(new Set(ids).size).toBe(32);
  expect(ids).toEqual(
    (await discoverEvidence(input, { maxBytes: 262144 })).items.map(
      (item) => item.id,
    ),
  );
  input.snapshot.documentation = [];
  const empty = await discoverEvidence({ snapshot: input.snapshot });
  expect(empty.items).toEqual([]);
  expect(empty.coverage.inventory.recordedEntries).toBe(2);
});
test("selection preserves overlaps, exact CRLF text, origins, and deterministic output", async () => {
  const input = evidenceFixture();
  const request = {
    ...pathRequest(),
    selector: {
      type: "path",
      path: "README.md",
      lines: { start: 11, end: 11 },
    },
  };
  const first = await retrieveEvidence(input, request);
  expect(first.items).toHaveLength(2);
  for (const item of first.items) {
    expect(item.type).toBe("source");
    if (item.type === "source") {
      expect(item.text).toBe("second\r\n");
      expect(item.source.lines).toEqual({ start: 11, end: 11 });
    }
  }
  expect(serializeEvidenceResponse(first)).toBe(
    serializeEvidenceResponse(await retrieveEvidence(input, request)),
  );
  checkBudget(first);
});
test("source and step selectors enforce revision and return real history metadata", async () => {
  const input = evidenceFixture();
  const source = {
    schemaVersion: 1,
    selector: {
      type: "source",
      repositoryId: identity,
      commitSha: sha,
      path: "README.md",
    },
  };
  expect((await retrieveEvidence(input, source)).items).toHaveLength(2);
  await expect(
    retrieveEvidence(input, {
      ...source,
      selector: { ...source.selector, commitSha: "f".repeat(40) },
    }),
  ).rejects.toThrow("identity");
  const history = {
    schemaVersion: 1,
    selector: { type: "step", workflowId: "example", stepId: "history" },
  };
  const response = await retrieveEvidence(input, history);
  expect(response.items[0]).toMatchObject({
    type: "history",
    commit: input.snapshot.history[0],
  });
  expect(response.items[0]).not.toHaveProperty("source");
  await expect(
    retrieveEvidence(input, {
      ...history,
      selector: { ...history.selector, lines: { start: 1, end: 1 } },
    }),
  ).rejects.toThrow("History");
});
test("missing paths, uncaptured inventory, unknown steps, and unavailable steps stay distinct", async () => {
  const input = evidenceFixture();
  expect(
    (await retrieveEvidence(input, pathRequest("missing"))).reasons,
  ).toContain("unknown-path");
  expect(
    (await retrieveEvidence(input, pathRequest("uncaptured.ts"))).reasons,
  ).toContain("not-captured");
  const step = {
    schemaVersion: 1,
    selector: { type: "step", workflowId: "example", stepId: "missing" },
  };
  expect((await retrieveEvidence(input, step)).reasons).toContain(
    "unknown-step",
  );
  required(input.bundle.steps[0]).evidence = {
    type: "unavailable",
    reason: "missing-object",
  };
  const response = await retrieveEvidence(input, {
    ...step,
    selector: { ...step.selector, stepId: "source" },
  });
  expect(response.status).toBe("unavailable");
  expect(response.items[0]?.reasons).toContain("missing-object");
});
test("ranges expose missing lines, unknown origins, and uncertain collection boundaries", async () => {
  const input = evidenceFixture();
  const request = {
    schemaVersion: 1,
    selector: {
      type: "step",
      workflowId: "example",
      stepId: "source",
      lines: { start: 9, end: 14 },
    },
  };
  const partial = await retrieveEvidence(input, request);
  expect(partial.items[0]).toMatchObject({
    status: "partial",
    source: { lines: { start: 10, end: 12 } },
    missingRanges: [
      { start: 9, end: 9 },
      { start: 13, end: 14 },
    ],
  });
  input.bundle.omissions.push({
    path: "README.md",
    reason: "per-file-byte-limit",
    detail: "truncated",
  });
  const truncated = await retrieveEvidence(input, request);
  expect(truncated.items[0]).toMatchObject({
    text: "first\r\nsecond\r\n",
    source: { lines: { start: 10, end: 11 } },
    missingRanges: [
      { start: 9, end: 9 },
      { start: 12, end: 14 },
    ],
  });
  const whole = await retrieveEvidence(input, {
    ...request,
    selector: { type: "step", workflowId: "example", stepId: "source" },
  });
  expect(whole.items[0]).toMatchObject({
    text: "first\r\nsecond\r\nthird",
    reasons: ["collection-truncated"],
  });
  const evidence = required(input.bundle.steps[0]).evidence;
  if (evidence.type === "source") evidence.source.lines = null;
  expect((await retrieveEvidence(input, request)).items[0]?.reasons).toContain(
    "line-range-unknown",
  );
});
test("complete JSON budgets preserve Unicode and citations and disclose omitted details", async () => {
  const input = evidenceFixture('😀 "quoted" \\ slash\n'.repeat(800));
  input.snapshot.coverage.omissions.push({
    path: "README.md",
    reason: "per-file-byte-limit",
    detail: "x".repeat(9000),
  });
  const response = await retrieveEvidence(
    input,
    pathRequest("README.md", 4096),
  );
  checkBudget(response);
  expect(response.status).toBe("partial");
  expect(response.budget.omittedLines).toBeGreaterThan(0);
  expect(response.coverage.omittedDetails).toBe(1);
  const item = response.items[0];
  expect(item?.type).toBe("source");
  if (item?.type === "source") {
    expect(
      required(input.snapshot.documentation[0]).text.startsWith(item.text),
    ).toBe(true);
    expect(item.text.endsWith("\n")).toBe(true);
    expect(item.text).not.toContain("�");
    expect(item.source.lines?.end).toBe(10 + item.text.split("\n").length - 2);
  }
});
test("oversized lines and history records remain indivisible; oversized envelope fails", async () => {
  const input = evidenceFixture("x".repeat(9000));
  const response = await retrieveEvidence(
    input,
    pathRequest("README.md", 4096),
  );
  checkBudget(response);
  expect(response.items).toEqual([]);
  expect(response.reasons).toContain("response-budget");
  const history = required(input.bundle.steps[1]).evidence;
  if (history.type === "history") history.commit.subject = "x".repeat(9000);
  const request = {
    schemaVersion: 1,
    maxBytes: 4096,
    selector: { type: "step", workflowId: "example", stepId: "history" },
  };
  expect((await retrieveEvidence(input, request)).items).toEqual([]);
  await expect(
    retrieveEvidence(input, pathRequest("x".repeat(9000), 4096)),
  ).rejects.toThrow("budget-too-small");
  required(input.bundle.steps[0]).label = "x".repeat(9000);
  await expect(
    discoverEvidence(
      {
        snapshot: { ...input.snapshot, documentation: [] },
        bundle: input.bundle,
      },
      { maxBytes: 4096, offset: 1 },
    ),
  ).rejects.toThrow("descriptor");
});
test("selection yields for cancellation and honors an expired operation deadline", async () => {
  const input = evidenceFixture();
  const controller = new AbortController();
  const result = retrieveEvidence(input, pathRequest(), controller.signal);
  controller.abort(new Error("canceled"));
  await expect(result).rejects.toThrow("canceled");
  await expect(
    discoverEvidence(input, {}, AbortSignal.timeout(0)),
  ).rejects.toThrow();
  await expect(
    validateRetrievalInputs(input.snapshot, input.bundle, AbortSignal.abort()),
  ).rejects.toThrow();
});

test("budget line counts include later omitted captures and ranged citations never expand", async () => {
  const input = evidenceFixture(
    "line with enough bytes to exhaust a small response budget\n".repeat(200),
  );
  const response = await retrieveEvidence(
    input,
    pathRequest("README.md", 4096),
  );
  const returned = response.items.reduce(
    (sum, item) =>
      sum +
      (item.type === "source" && item.source.lines
        ? item.source.lines.end - item.source.lines.start + 1
        : 0),
    0,
  );
  expect(response.budget.omittedLines).toBe(402 - returned);
  checkBudget(response);
  const ranged = await retrieveEvidence(input, {
    schemaVersion: 1,
    maxBytes: 4096,
    selector: {
      type: "step",
      workflowId: "example",
      stepId: "source",
      lines: { start: 10, end: 150 },
    },
  });
  const item = ranged.items[0];
  expect(item?.type).toBe("source");
  if (item?.type === "source") {
    expect(item.source.lines?.end).toBeLessThanOrEqual(150);
    expect(item.omittedLines).toBe(141 - (required(item.source.lines).end - 9));
  }
  checkBudget(ranged);
});
test("non-overlapping ranges preserve the whole missing range and null ranges stay null", async () => {
  const input = evidenceFixture();
  const response = await retrieveEvidence(input, {
    schemaVersion: 1,
    selector: {
      type: "step",
      workflowId: "example",
      stepId: "source",
      lines: { start: 50, end: 55 },
    },
  });
  expect(response.items[0]).toMatchObject({
    type: "unavailable",
    missingRanges: [{ start: 50, end: 55 }],
  });
  const capture = required(input.snapshot.documentation[0]);
  capture.source.lines = null;
  const whole = await retrieveEvidence(
    { snapshot: input.snapshot },
    pathRequest(),
  );
  expect(whole.items[0]).toMatchObject({
    type: "source",
    source: { lines: null },
    text: capture.text,
  });
});
