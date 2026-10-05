import { createHash } from "node:crypto";
import { expect, test } from "vitest";

import {
  type SourceCapture,
  sourceCaptureContentIdentity,
  sourceCaptureLimits,
  sourceCaptureRequestSchema,
  sourceCaptureSchema,
  sourceTextDigest,
  validateSourceCapture,
} from "../packages/contracts/src/index.ts";
import { evidenceFixture, required } from "./fixtures/retrieval.ts";

const snapshot = evidenceFixture().snapshot;
const selection = { path: "src/example.ts", lines: { start: 1, end: 1 } };
const blobId = "d".repeat(40);
const helloDigest =
  "sha256:5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03";

// Independent Node implementation signs fixtures, rather than trusting the validator's hasher.
function digest(value: unknown) {
  const serialized = JSON.stringify(value, (_, nested) =>
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? Object.fromEntries(
          Object.entries(nested).sort(([a], [b]) =>
            a < b ? -1 : a > b ? 1 : 0,
          ),
        )
      : nested,
  );
  return `sha256:${createHash("sha256").update(serialized).digest("hex")}`;
}
function fixture() {
  const artifact: SourceCapture = {
    schemaVersion: 1,
    contentIdentity: snapshot.contentIdentity,
    snapshot: {
      contentIdentity: snapshot.contentIdentity,
      repository: snapshot.repository,
    },
    limits: { ...sourceCaptureLimits },
    selections: [structuredClone(selection)],
    entries: [
      {
        selection: structuredClone(selection),
        status: "available",
        blobId,
        fileLineCount: 2,
        actualRange: { start: 1, end: 1 },
        text: "hello\n",
        contentDigest: helloDigest,
        missingRanges: [],
        reasons: [],
      },
    ],
    blobs: [{ objectId: blobId, bytesRead: 6 }],
    coverage: {
      requestedSelections: 1,
      capturedSelections: 1,
      partialSelections: 0,
      unavailableSelections: 0,
      bytesRead: 6,
      bytesReturned: 6,
    },
    run: {
      collectorVersion: "0.0.0",
      startedAt: "2026-10-05T00:00:00Z",
      completedAt: "2026-10-05T00:00:01Z",
      durationMs: 1000,
    },
  };
  return sign(artifact);
}
function sign<T extends { contentIdentity: string; run: unknown }>(
  artifact: T,
): T {
  const { contentIdentity: _identity, run: _run, ...semantic } = artifact;
  return { ...artifact, contentIdentity: digest(semantic) };
}

function assembled(
  entries: SourceCapture["entries"],
  blobs: SourceCapture["blobs"],
): SourceCapture {
  const artifact = fixture();
  artifact.entries = entries.map((entry) => ({
    ...entry,
    contentDigest:
      entry.text === null
        ? null
        : `sha256:${createHash("sha256").update(entry.text).digest("hex")}`,
  }));
  artifact.selections = artifact.entries.map((entry) => entry.selection);
  artifact.blobs = blobs;
  artifact.coverage = {
    requestedSelections: entries.length,
    capturedSelections: entries.filter(
      (entry) => entry.status !== "unavailable",
    ).length,
    partialSelections: entries.filter((entry) => entry.status === "partial")
      .length,
    unavailableSelections: entries.filter(
      (entry) => entry.status === "unavailable",
    ).length,
    bytesRead: blobs.reduce((total, blob) => total + blob.bytesRead, 0),
    bytesReturned: entries.reduce(
      (total, entry) => total + Buffer.byteLength(entry.text ?? ""),
      0,
    ),
  };
  return sign(artifact);
}
function textArtifact(text: string, copies = 1): SourceCapture {
  const entry = required(fixture().entries[0]);
  return assembled(
    Array.from({ length: copies }, (_, i) => ({
      ...entry,
      selection: { path: `src/${i}.ts`, lines: { start: 1, end: 1 } },
      fileLineCount: 1,
      text,
    })),
    [{ objectId: blobId, bytesRead: Buffer.byteLength(text) }],
  );
}
function issues(artifact: unknown) {
  const result = sourceCaptureSchema.safeParse(artifact);
  expect(result.success).toBe(false);
  if (result.success) throw new Error("Expected an invalid artifact");
  return result.error.issues;
}

test("selected source requests sort exact paths and inclusive ranges", () => {
  expect(
    sourceCaptureRequestSchema.parse({
      schemaVersion: 1,
      selections: [
        { path: "src/z.ts", lines: { start: 2, end: 4 } },
        { path: "src/a.ts", lines: { start: 3, end: 3 } },
        { path: "src/a.ts", lines: { start: 1, end: 2 } },
      ],
    }).selections,
  ).toEqual([
    { path: "src/a.ts", lines: { start: 1, end: 2 } },
    { path: "src/a.ts", lines: { start: 3, end: 3 } },
    { path: "src/z.ts", lines: { start: 2, end: 4 } },
  ]);
});

test.each([
  "/etc/passwd",
  "../a.ts",
  "src/../a.ts",
  "./a.ts",
  "src//a.ts",
  "src/",
  "C:/a.ts",
  "src\\a.ts",
  "src/*.ts",
  "src/[ab].ts",
  "src/{a,b}.ts",
  "src/+(a).ts",
  "a\n.ts",
  "a\u0085.ts",
  "a\ud800.ts",
])("rejects unsafe or non-exact path %j", (path) => {
  expect(
    sourceCaptureRequestSchema.safeParse({
      schemaVersion: 1,
      selections: [{ ...selection, path }],
    }).success,
  ).toBe(false);
});

test("requests reject duplicate ranges, invalid ranges, configurable limits, and selection/byte excess", () => {
  for (const request of [
    { schemaVersion: 1, selections: [selection, selection] },
    { schemaVersion: 1, selections: [] },
    {
      schemaVersion: 1,
      selections: Array.from({ length: 17 }, (_, i) => ({
        ...selection,
        path: `src/${i}.ts`,
      })),
    },
    {
      schemaVersion: 1,
      selections: [{ ...selection, lines: { start: 0, end: 1 } }],
    },
    {
      schemaVersion: 1,
      selections: [{ ...selection, lines: { start: 2, end: 1 } }],
    },
    {
      schemaVersion: 1,
      selections: [
        { ...selection, lines: { start: 1, end: Number.MAX_SAFE_INTEGER + 1 } },
      ],
    },
    { schemaVersion: 1, selections: [selection], maxBytes: 999999 },
    {
      schemaVersion: 1,
      selections: [{ ...selection, path: "é".repeat(8192) }],
    },
  ])
    expect(sourceCaptureRequestSchema.safeParse(request).success).toBe(false);
});

test("validates independent SHA-256 text and semantic identities and snapshot binding", async () => {
  const artifact = fixture();
  expect(await sourceTextDigest("hello\n")).toBe(helloDigest);
  expect(await sourceCaptureContentIdentity(artifact)).toBe(
    artifact.contentIdentity,
  );
  expect(await validateSourceCapture(artifact, snapshot)).toEqual(artifact);
  const later = {
    ...artifact,
    run: {
      ...artifact.run,
      startedAt: "2026-10-06T00:00:00Z",
      completedAt: "2026-10-06T00:00:01Z",
    },
  };
  expect(await sourceCaptureContentIdentity(later)).toBe(
    artifact.contentIdentity,
  );
  await expect(validateSourceCapture(later, snapshot)).resolves.toEqual(later);
  for (const changed of [
    { ...artifact, contentIdentity: `sha256:${"0".repeat(64)}` },
    {
      ...artifact,
      entries: [
        { ...artifact.entries[0], contentDigest: `sha256:${"0".repeat(64)}` },
      ],
    },
    sign({
      ...artifact,
      entries: [{ ...artifact.entries[0], text: "world\n" }],
    }),
    sign({
      ...artifact,
      snapshot: {
        ...artifact.snapshot,
        contentIdentity: `sha256:${"0".repeat(64)}`,
      },
    }),
    sign({
      ...artifact,
      snapshot: {
        ...artifact.snapshot,
        repository: {
          ...artifact.snapshot.repository,
          id: `sha256:${"0".repeat(64)}`,
        },
      },
    }),
    sign({
      ...artifact,
      snapshot: {
        ...artifact.snapshot,
        repository: {
          ...artifact.snapshot.repository,
          headCommit: "0".repeat(40),
        },
      },
    }),
  ])
    await expect(validateSourceCapture(changed, snapshot)).rejects.toThrow();
});

test("complete-line validation handles CRLF, Unicode, unterminated and trailing empty lines", async () => {
  for (const [text, end, fileLineCount] of [
    ["hello\n", 1, 2],
    ["hello\n", 2, 2],
    ["", 1, 1],
    ["", 1, 2],
    ["雪\r\nend", 2, 2],
    ["last", 1, 1],
  ] as const) {
    const artifact = fixture();
    const bytes = Buffer.byteLength(text);
    const start = text === "" && fileLineCount === 2 ? 2 : 1;
    const actualEnd = start === 2 ? 2 : end;
    artifact.selections[0] = {
      path: selection.path,
      lines: { start, end: actualEnd },
    };
    artifact.entries[0] = {
      ...required(artifact.entries[0]),
      selection: artifact.selections[0],
      actualRange: { start, end: actualEnd },
      fileLineCount,
      text,
      contentDigest: `sha256:${createHash("sha256").update(text).digest("hex")}`,
    };
    required(artifact.blobs[0]).bytesRead = Math.max(bytes, fileLineCount - 1);
    artifact.coverage.bytesRead = required(artifact.blobs[0]).bytesRead;
    artifact.coverage.bytesReturned = bytes;
    await expect(
      validateSourceCapture(sign(artifact), snapshot),
    ).resolves.toBeDefined();
  }
  for (const entry of [
    {
      ...fixture().entries[0],
      text: "hello",
      contentDigest: `sha256:${createHash("sha256").update("hello").digest("hex")}`,
    },
    { ...fixture().entries[0], actualRange: { start: 1, end: 2 } },
    { ...fixture().entries[0], text: "\ud800" },
    { ...fixture().entries[0], text: "hello\0" },
  ])
    expect(
      sourceCaptureSchema.safeParse({ ...fixture(), entries: [entry] }).success,
    ).toBe(false);
});

test("partial and unavailable entries preserve the exact missing suffix and truthful coverage", async () => {
  const partial = fixture();
  required(partial.selections[0]).lines.end = 5;
  partial.entries[0] = {
    ...required(partial.entries[0]),
    selection: required(partial.selections[0]),
    status: "partial",
    missingRanges: [{ start: 2, end: 5 }],
    reasons: ["text-byte-limit"],
  };
  partial.coverage.partialSelections = 1;
  await expect(
    validateSourceCapture(sign(partial), snapshot),
  ).resolves.toBeDefined();
  const unavailable = fixture();
  unavailable.entries[0] = {
    ...required(unavailable.entries[0]),
    status: "unavailable",
    blobId: null,
    fileLineCount: null,
    actualRange: null,
    text: null,
    contentDigest: null,
    missingRanges: [{ start: 1, end: 1 }],
    reasons: ["missing-path"],
  };
  unavailable.blobs = [];
  unavailable.coverage = {
    ...unavailable.coverage,
    capturedSelections: 0,
    unavailableSelections: 1,
    bytesRead: 0,
    bytesReturned: 0,
  };
  await expect(
    validateSourceCapture(sign(unavailable), snapshot),
  ).resolves.toBeDefined();
  for (const artifact of [
    { ...partial, entries: [{ ...partial.entries[0], reasons: [] }] },
    {
      ...partial,
      entries: [
        { ...partial.entries[0], missingRanges: [{ start: 3, end: 5 }] },
      ],
    },
    { ...partial, entries: [{ ...partial.entries[0], status: "available" }] },
    {
      ...unavailable,
      entries: [{ ...unavailable.entries[0], text: "invented" }],
    },
    { ...fixture(), coverage: { ...fixture().coverage, bytesReturned: 5 } },
    { ...fixture(), entries: [] },
    {
      ...fixture(),
      entries: [
        {
          ...fixture().entries[0],
          selection: { ...selection, path: "other.ts" },
        },
      ],
    },
  ])
    expect(sourceCaptureSchema.safeParse(artifact).success).toBe(false);
});

test("deduplicated blob reads count once while repeated excerpts count separately", async () => {
  const artifact = fixture();
  const second = { path: "src/other.ts", lines: { start: 1, end: 1 } };
  artifact.selections.push(second);
  artifact.entries.push({
    ...required(artifact.entries[0]),
    selection: second,
  });
  artifact.coverage = {
    ...artifact.coverage,
    requestedSelections: 2,
    capturedSelections: 2,
    bytesReturned: 12,
  };
  await expect(
    validateSourceCapture(sign(artifact), snapshot),
  ).resolves.toBeDefined();
  expect(
    sourceCaptureSchema.safeParse({
      ...artifact,
      blobs: [...artifact.blobs, ...artifact.blobs],
    }).success,
  ).toBe(false);
  expect(
    sourceCaptureSchema.safeParse({
      ...artifact,
      coverage: { ...artifact.coverage, bytesRead: 12 },
    }).success,
  ).toBe(false);
  expect(
    sourceCaptureSchema.safeParse({ ...artifact, blobs: [] }).success,
  ).toBe(false);
});

test("overlapping selections must agree on path, blob, line count and exact line text", async () => {
  const entry = required(fixture().entries[0]);
  const whole = {
    ...entry,
    selection: { path: selection.path, lines: { start: 1, end: 2 } },
    actualRange: { start: 1, end: 2 },
  };
  const captures = [entry, whole];
  const reads = [{ objectId: blobId, bytesRead: 6 }];
  await expect(
    validateSourceCapture(assembled(captures, reads), snapshot),
  ).resolves.toBeDefined();
  for (const artifact of [
    assembled([{ ...entry, text: "world\n" }, whole], reads),
    assembled([{ ...entry, fileLineCount: 3 }, whole], reads),
    assembled(
      [{ ...entry, blobId: "c".repeat(40) }, whole],
      [{ objectId: "c".repeat(40), bytesRead: 6 }, ...reads],
    ),
  ])
    await expect(validateSourceCapture(artifact, snapshot)).rejects.toThrow();
});

test("whole-file captures return exactly the recorded blob bytes", async () => {
  const artifact = textArtifact("");
  await expect(
    validateSourceCapture(artifact, snapshot),
  ).resolves.toBeDefined();
  required(artifact.blobs[0]).bytesRead = 6;
  artifact.coverage.bytesRead = 6;
  await expect(
    validateSourceCapture(sign(artifact), snapshot),
  ).rejects.toThrow();
});

test("request byte boundary counts UTF-8 and the serialized newline", () => {
  const request = {
    schemaVersion: 1,
    selections: [{ ...selection, path: "" }],
  };
  const overhead = Buffer.byteLength(`${JSON.stringify(request)}\n`);
  required(request.selections[0]).path = "a".repeat(
    sourceCaptureLimits.maximumRequestBytes - overhead,
  );
  expect(sourceCaptureRequestSchema.safeParse(request).success).toBe(true);
  required(request.selections[0]).path += "a";
  const result = sourceCaptureRequestSchema.safeParse(request);
  expect(result.success).toBe(false);
  if (result.success) throw new Error("Expected an oversized request");
  expect(result.error.issues.map((issue) => issue.message)).toEqual([
    "Source request byte limit exceeded",
  ]);
});

test("selection text byte cap rejects an otherwise consistent complete-line capture", () => {
  expect(
    sourceCaptureSchema.safeParse(
      textArtifact("x".repeat(sourceCaptureLimits.maximumSelectionTextBytes)),
    ).success,
  ).toBe(true);
  const rejected = issues(
    textArtifact("x".repeat(sourceCaptureLimits.maximumSelectionTextBytes + 1)),
  );
  expect(rejected.map((issue) => issue.message)).toEqual([
    "Selection text byte limit exceeded",
  ]);
});

test("blob read byte cap rejects only the oversized recorded read", () => {
  const artifact = fixture();
  required(artifact.blobs[0]).bytesRead = sourceCaptureLimits.maximumBlobBytes;
  artifact.coverage.bytesRead = sourceCaptureLimits.maximumBlobBytes;
  expect(sourceCaptureSchema.safeParse(artifact).success).toBe(true);
  required(artifact.blobs[0]).bytesRead += 1;
  artifact.coverage.bytesRead += 1;
  expect(issues(artifact).map((issue) => issue.path)).toEqual([
    ["blobs", 0, "bytesRead"],
  ]);
});

test("combined read budget counts unique blobs at its exact boundary", () => {
  const entry = required(fixture().entries[0]);
  const build = (count: number) =>
    assembled(
      Array.from({ length: count }, (_, i) => ({
        ...entry,
        selection: { path: `src/${i}.ts`, lines: { start: 1, end: 1 } },
        status: "unavailable",
        blobId: String(i + 1).repeat(40),
        fileLineCount: null,
        actualRange: null,
        text: null,
        contentDigest: null,
        missingRanges: [{ start: 1, end: 1 }],
        reasons: ["binary"],
      })),
      Array.from({ length: count }, (_, i) => ({
        objectId: String(i + 1).repeat(40),
        bytesRead: sourceCaptureLimits.maximumBlobBytes,
      })),
    );
  expect(sourceCaptureSchema.safeParse(build(4)).success).toBe(true);
  expect(issues(build(5)).map((issue) => issue.path)).toEqual([
    ["coverage", "bytesRead"],
  ]);
});

test("combined text budget counts repeated excerpts at its exact boundary", () => {
  const text = "x".repeat(sourceCaptureLimits.maximumSelectionTextBytes);
  expect(sourceCaptureSchema.safeParse(textArtifact(text, 4)).success).toBe(
    true,
  );
  expect(issues(textArtifact(text, 5)).map((issue) => issue.path)).toEqual([
    ["coverage", "bytesReturned"],
  ]);
});

test("serialized artifact budget accounts for JSON escaping independently of text bytes", () => {
  const artifact = textArtifact(
    "\u0001".repeat(sourceCaptureLimits.maximumSelectionTextBytes),
    4,
  );
  expect(issues(artifact).map((issue) => issue.message)).toEqual([
    "Source artifact byte limit exceeded",
  ]);
});

test("artifacts reject inconsistent spans and raised limits", () => {
  const artifact = fixture();
  for (const changed of [
    { ...artifact, limits: { ...artifact.limits, maximumSelections: 17 } },
    { ...artifact, entries: [{ ...artifact.entries[0], fileLineCount: 0 }] },
    {
      ...artifact,
      entries: [{ ...artifact.entries[0], actualRange: { start: 2, end: 2 } }],
    },
  ])
    expect(sourceCaptureSchema.safeParse(changed).success).toBe(false);
});

test("integrity validation honors cancellation", async () => {
  const controller = new AbortController();
  controller.abort(new Error("canceled"));
  await expect(
    validateSourceCapture(fixture(), snapshot, controller.signal),
  ).rejects.toThrow("canceled");
});
