import { expect, test, vi } from "vitest";
import { loadExplanationReport } from "../apps/web/src/explanation-report.tsx";
import {
  explainEvidence,
  explanationEndpoint,
  previewExplanation,
} from "../packages/explanations/src/index.ts";
import { buildGuidedLesson } from "../packages/knowledge/src/lesson.ts";
import { lessonFixture } from "./fixtures/lesson.ts";
import {
  evidenceFixture,
  pathRequest,
  required,
} from "./fixtures/retrieval.ts";

function wire(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id: "resp_fixture",
    model: "gpt-4.1-mini-2025-04-14",
    status: "completed",
    output: [
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text: JSON.stringify({
              blocks: [
                {
                  kind: "inference",
                  text: "This is a model interpretation of the selected evidence.",
                  citations: [id],
                },
              ],
            }),
          },
        ],
      },
    ],
    usage: { input_tokens: 120, output_tokens: 60 },
    ...overrides,
  };
}
function transport(value: unknown) {
  return vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify(value), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}
test("preview is deterministic and performs no credential lookup or external call", async () => {
  const inputs = evidenceFixture();
  const key = vi.fn(() => "secret");
  const send = vi.fn<typeof fetch>();
  const a = await explainEvidence(inputs, pathRequest(), {
    getApiKey: key,
    transport: send,
  });
  const b = await previewExplanation(inputs, pathRequest());
  expect(a).toEqual(b);
  expect(key).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
  expect(b.endpoint).toBe(explanationEndpoint);
  expect(b.body.store).toBe(false);
});
test("approval binds exact source, limits, and artifact identity before credentials or dispatch", async () => {
  const inputs = evidenceFixture();
  const preview = await previewExplanation(inputs, pathRequest());
  const key = vi.fn(() => "secret");
  const send = vi.fn<typeof fetch>();
  for (const limits of [{ maxOutputTokens: 999 }, { maxCostUsd: 0.02 }])
    await expect(
      explainEvidence(inputs, pathRequest(), {
        approval: preview.approvalDigest,
        limits,
        getApiKey: key,
        transport: send,
      }),
    ).rejects.toThrow("Approval");
  required(inputs.snapshot.documentation[0]).text = "changed\nsecond\nthird";
  await expect(
    explainEvidence(inputs, pathRequest(), {
      approval: preview.approvalDigest,
      getApiKey: key,
      transport: send,
    }),
  ).rejects.toThrow("Approval");
  expect(key).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
});
test("budgets and unavailable evidence are rejected offline", async () => {
  const inputs = evidenceFixture();
  await expect(
    previewExplanation(inputs, pathRequest(), { maxCostUsd: 0.0001 }),
  ).rejects.toThrow("cost");
  await expect(
    previewExplanation(inputs, pathRequest("absent")),
  ).rejects.toThrow("source");
  await expect(
    previewExplanation(inputs, pathRequest("README.md", 262144)),
  ).rejects.toThrow("32768");
  const preview = await previewExplanation(inputs, pathRequest());
  await expect(
    explainEvidence(inputs, pathRequest(), {
      approval: preview.approvalDigest,
    }),
  ).rejects.toThrow("OPENAI_API_KEY");
});
test("one approved request sends only the reviewed body and returns labeled usage and provenance", async () => {
  const inputs = evidenceFixture();
  const preview = await previewExplanation(inputs, pathRequest());
  const send = transport(wire(required(preview.sources[0]).id));
  const report = await explainEvidence(inputs, pathRequest(), {
    approval: preview.approvalDigest,
    getApiKey: () => "fake-key",
    transport: send,
  });
  expect(send).toHaveBeenCalledTimes(1);
  expect(send.mock.calls[0]?.[0]).toBe(explanationEndpoint);
  expect(send.mock.calls[0]?.[1]).toMatchObject({
    redirect: "error",
    body: JSON.stringify(preview.body),
  });
  expect(JSON.stringify(report)).not.toContain("fake-key");
  expect(report.kind).toBe("explanation-report");
  if (report.kind === "explanation-report") {
    expect(report.usage).toEqual({ inputTokens: 120, outputTokens: 60 });
    expect(report.content.blocks[0]?.kind).toBe("inference");
    expect(report.cost.reportedUsageEstimateUsd).toBeCloseTo(0.000144);
  }
});
test("invalid or refused provider results never produce a report or retry", async () => {
  const inputs = evidenceFixture();
  const preview = await previewExplanation(inputs, pathRequest());
  const id = required(preview.sources[0]).id;
  const cases = [
    wire(id, { status: "incomplete" }),
    wire(id, { usage: undefined }),
    wire(id, { usage: { input_tokens: 1, output_tokens: 1001 } }),
    wire("invented-source"),
    wire(id, {
      output: [
        {
          type: "message",
          content: [{ type: "refusal", refusal: "private provider response" }],
        },
      ],
    }),
    wire(id, {
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                blocks: [
                  { kind: "quote", text: "invented quote", citations: [id] },
                ],
              }),
            },
          ],
        },
      ],
    }),
  ];
  for (const value of cases) {
    const send = transport(value);
    await expect(
      explainEvidence(inputs, pathRequest(), {
        approval: preview.approvalDigest,
        getApiKey: () => "secret",
        transport: send,
      }),
    ).rejects.toThrow("Charges may have occurred");
    expect(send).toHaveBeenCalledTimes(1);
  }
});
test("HTTP errors, oversized bodies, cancellation, and deadline aborts disclose unknown usage", async () => {
  const inputs = evidenceFixture();
  const preview = await previewExplanation(inputs, pathRequest());
  for (const response of [
    new Response("private-body", { status: 429 }),
    new Response("x".repeat(1048577)),
    new Response("not json"),
  ]) {
    const send = vi.fn<typeof fetch>().mockResolvedValue(response);
    await expect(
      explainEvidence(inputs, pathRequest(), {
        approval: preview.approvalDigest,
        getApiKey: () => "secret",
        transport: send,
      }),
    ).rejects.toThrow("usage is unknown");
    expect(send).toHaveBeenCalledTimes(1);
  }
  const controller = new AbortController();
  const send = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
    controller.abort();
    init?.signal?.throwIfAborted();
    return new Response();
  });
  await expect(
    explainEvidence(inputs, pathRequest(), {
      approval: preview.approvalDigest,
      getApiKey: () => "secret",
      transport: send,
      signal: controller.signal,
    }),
  ).rejects.toThrow("canceled");
  await expect(
    explainEvidence(inputs, pathRequest(), {
      approval: preview.approvalDigest,
      getApiKey: () => "secret",
      signal: AbortSignal.timeout(0),
    }),
  ).rejects.toThrow();
});
test("browser report validation binds exact selected excerpts and local lesson identities", async () => {
  const inputs = lessonFixture();
  const lesson = await buildGuidedLesson(inputs.snapshot, inputs.bundle);
  const request = {
    schemaVersion: 1,
    selector: {
      type: "step",
      workflowId: "openspec-new-change",
      stepId: "implementation",
      lines: { start: 10, end: 10 },
    },
  };
  const preview = await previewExplanation(inputs, request);
  const report = await explainEvidence(inputs, request, {
    approval: preview.approvalDigest,
    getApiKey: () => "fixture",
    transport: transport(wire(required(preview.sources[0]).id)),
  });
  const file = (value: unknown) =>
    new File([JSON.stringify(value)], "report.json");
  await expect(
    loadExplanationReport(file(report), lesson),
  ).resolves.toMatchObject({ kind: "explanation-report" });
  const bad = structuredClone(report);
  if (bad.kind === "explanation-report")
    required(bad.sources[0]).text = "not captured";
  await expect(loadExplanationReport(file(bad), lesson)).rejects.toThrow(
    "source",
  );
  await expect(
    loadExplanationReport(new File(["x".repeat(262145)], "large.json"), lesson),
  ).rejects.toThrow("limit");
  await expect(
    loadExplanationReport(
      file({
        ...report,
        inputs: {
          snapshot: `sha256:${"f".repeat(64)}`,
          bundle: lesson.bundleIdentity,
        },
      }),
      lesson,
    ),
  ).rejects.toThrow("different");
});

test("a deadline during provider body reading cancels the stream without retrying", async () => {
  const input = evidenceFixture();
  const preview = await previewExplanation(input, pathRequest());
  const controller = new AbortController();
  let canceled = false;
  const send = vi.fn<typeof fetch>().mockImplementation(async () => {
    setTimeout(() => controller.abort(new Error("deadline")), 10);
    return new Response(
      new ReadableStream({
        cancel() {
          canceled = true;
        },
      }),
    );
  });
  await expect(
    explainEvidence(input, pathRequest(), {
      approval: preview.approvalDigest,
      getApiKey: () => "fixture",
      transport: send,
      signal: controller.signal,
    }),
  ).rejects.toThrow("usage is unknown");
  expect(canceled).toBe(true);
  expect(send).toHaveBeenCalledTimes(1);
});
