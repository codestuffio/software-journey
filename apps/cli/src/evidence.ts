import {
  discoveryRequestSchema,
  retrievalLimits,
  retrievalRequestSchema,
} from "@software-journey/contracts";
import {
  discoverEvidence,
  retrieveEvidence,
  serializeEvidenceResponse,
} from "@software-journey/knowledge";
import {
  loadEvidenceArtifacts,
  readBoundedJson,
} from "@software-journey/repository";

export async function runEvidenceCommand(args: string[]): Promise<void> {
  const controller = new AbortController();
  const cancel = () =>
    controller.abort(new Error("Evidence operation canceled"));
  const deadline = AbortSignal.timeout(retrievalLimits.deadlineMs);
  const signal = AbortSignal.any([controller.signal, deadline]);
  process.once("SIGINT", cancel);
  process.once("SIGTERM", cancel);
  try {
    const discover = args[0] === "context";
    const allowed = new Set(
      discover
        ? ["--snapshot", "--bundle", "--max-bytes", "--offset"]
        : ["--snapshot", "--bundle", "--request"],
    );
    const flags = new Map<string, string>();
    for (let index = 1; index < args.length; index += 2) {
      const flag = args[index];
      const value = args[index + 1];
      if (
        !flag ||
        !allowed.has(flag) ||
        flags.has(flag) ||
        !value ||
        value.startsWith("--")
      ) {
        throw new Error(
          "Invalid, duplicate, or missing argument. Run software-journey --help.",
        );
      }
      flags.set(flag, value);
    }
    const snapshotPath = flags.get("--snapshot");
    const requestPath = flags.get("--request");
    if (!snapshotPath || (!discover && !requestPath))
      throw new Error("Requires --snapshot and, for retrieve, --request.");
    const numericFlag = (name: string, fallback: number) => {
      const value = flags.get(name);
      if (value === undefined) return fallback;
      if (!/^\d+$/u.test(value))
        throw new Error(`Invalid numeric value for ${name}`);
      return Number(value);
    };
    const request = discover
      ? discoveryRequestSchema.parse({
          maxBytes: numericFlag("--max-bytes", retrievalLimits.defaultBytes),
          offset: numericFlag("--offset", 0),
        })
      : retrievalRequestSchema.parse(
          await readBoundedJson(
            requestPath ?? "",
            retrievalLimits.requestBytes,
            signal,
          ),
        );
    const inputs = await loadEvidenceArtifacts(
      snapshotPath,
      flags.get("--bundle"),
      signal,
    );
    const response = discover
      ? await discoverEvidence(inputs, request, signal)
      : await retrieveEvidence(inputs, request, signal);
    const output = serializeEvidenceResponse(response);
    // Let any pending cancellation/deadline fire before publishing buffered output.
    await new Promise((resolve) => setImmediate(resolve));
    signal.throwIfAborted();
    await new Promise<void>((resolve, reject) => {
      process.stdout.write(output, (error) =>
        error ? reject(error) : resolve(),
      );
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Evidence operation failed: ${message.slice(0, 512)}`);
    process.exitCode = 1;
  } finally {
    process.removeListener("SIGINT", cancel);
    process.removeListener("SIGTERM", cancel);
  }
}
