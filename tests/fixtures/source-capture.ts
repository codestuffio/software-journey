import {
  type SourceCapture,
  sourceCaptureContentIdentity,
  sourceCaptureLimits,
  sourceTextDigest,
} from "../../packages/contracts/src/index.ts";
import { evidenceFixture, identity } from "./retrieval.ts";

export async function sourcesFixture(): Promise<SourceCapture> {
  const { snapshot } = evidenceFixture();
  const selection = { path: "src/example.ts", lines: { start: 1, end: 1 } };
  const sources: SourceCapture = {
    schemaVersion: 1,
    contentIdentity: identity,
    snapshot: {
      contentIdentity: snapshot.contentIdentity,
      repository: snapshot.repository,
    },
    limits: { ...sourceCaptureLimits },
    selections: [selection],
    entries: [
      {
        selection,
        status: "available",
        blobId: "d".repeat(40),
        fileLineCount: 2,
        actualRange: selection.lines,
        text: "hello\n",
        contentDigest: await sourceTextDigest("hello\n"),
        missingRanges: [],
        reasons: [],
      },
    ],
    blobs: [{ objectId: "d".repeat(40), bytesRead: 6 }],
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
      startedAt: "2026-10-06T00:00:00Z",
      completedAt: "2026-10-06T00:00:01Z",
      durationMs: 1000,
    },
  };
  sources.contentIdentity = await sourceCaptureContentIdentity(sources);
  return sources;
}
