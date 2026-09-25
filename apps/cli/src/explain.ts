import {
  retrievalLimits,
  retrievalRequestSchema,
} from "@software-journey/contracts";
import { explainEvidence } from "@software-journey/explanations";
import {
  loadEvidenceArtifacts,
  readBoundedJson,
} from "@software-journey/repository";
export async function runExplainCommand(args: string[]) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once("SIGINT", cancel);
  process.once("SIGTERM", cancel);
  const signal = AbortSignal.any([
    controller.signal,
    AbortSignal.timeout(30000),
  ]);
  try {
    const allowed = new Set([
      "--snapshot",
      "--bundle",
      "--request",
      "--approve",
      "--max-cost-usd",
      "--max-output-tokens",
    ]);
    const flags = new Map<string, string>();
    for (let i = 1; i < args.length; i += 2) {
      const flag = args[i],
        value = args[i + 1];
      if (
        !flag ||
        !allowed.has(flag) ||
        flags.has(flag) ||
        !value ||
        value.startsWith("--")
      )
        throw new Error("Invalid, duplicate, or missing explain argument");
      flags.set(flag, value);
    }
    const snapshot = flags.get("--snapshot"),
      requestPath = flags.get("--request");
    if (!snapshot || !requestPath)
      throw new Error("Explain requires --snapshot and --request");
    const limits: Record<string, number> = {};
    for (const [flag, key] of [
      ["--max-cost-usd", "maxCostUsd"],
      ["--max-output-tokens", "maxOutputTokens"],
    ] as const) {
      const raw = flags.get(flag);
      if (raw !== undefined) {
        if (!/^\d+(\.\d+)?$/u.test(raw))
          throw new Error("Invalid explanation limit");
        limits[key] = Number(raw);
      }
    }
    const request = retrievalRequestSchema.parse(
      await readBoundedJson(requestPath, retrievalLimits.requestBytes, signal),
    );
    const inputs = await loadEvidenceArtifacts(
      snapshot,
      flags.get("--bundle"),
      signal,
    );
    const result = await explainEvidence(inputs, request, {
      limits,
      approval: flags.get("--approve"),
      getApiKey: () => process.env.OPENAI_API_KEY,
      signal,
    });
    await new Promise((resolve) => setImmediate(resolve));
    signal.throwIfAborted();
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(
      `Explanation failed: ${error instanceof Error ? error.message.slice(0, 512) : "Invalid request"}`,
    );
    process.exitCode = 1;
  } finally {
    process.removeListener("SIGINT", cancel);
    process.removeListener("SIGTERM", cancel);
  }
}
