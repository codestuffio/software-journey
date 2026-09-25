import { constants } from "node:fs";
import { open } from "node:fs/promises";
import {
  retrievalLimits,
  validateRetrievalInputs,
} from "@software-journey/contracts";

/** Read a single opened regular file, enforcing the cap again during reads. */
export async function readBoundedJson(
  path: string,
  maximumBytes: number,
  signal?: AbortSignal,
): Promise<unknown> {
  signal?.throwIfAborted();
  const handle = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) throw new Error("Input must be a regular file");
    if (stat.size > maximumBytes) throw new Error("Input size limit exceeded");
    const chunks: Buffer[] = [];
    let total = 0;
    while (true) {
      signal?.throwIfAborted();
      const buffer = Buffer.alloc(Math.min(65536, maximumBytes + 1 - total));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      total += bytesRead;
      if (total > maximumBytes) throw new Error("Input size limit exceeded");
      chunks.push(buffer.subarray(0, bytesRead));
    }
    signal?.throwIfAborted();
    const value: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
    );
    signal?.throwIfAborted();
    return value;
  } finally {
    await handle.close();
  }
}

export async function loadEvidenceArtifacts(
  snapshotPath: string,
  bundlePath?: string,
  signal?: AbortSignal,
) {
  const snapshot = await readBoundedJson(
    snapshotPath,
    retrievalLimits.artifactBytes,
    signal,
  );
  const bundle =
    bundlePath === undefined
      ? undefined
      : await readBoundedJson(
          bundlePath,
          retrievalLimits.artifactBytes,
          signal,
        );
  return validateRetrievalInputs(snapshot, bundle, signal);
}
