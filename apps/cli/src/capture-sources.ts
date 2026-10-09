import { sourceCaptureLimits } from "@software-journey/contracts";
import {
  captureSourcesToDirectory,
  RepositoryAnalysisError,
  readBoundedJson,
} from "@software-journey/repository";

export async function runCaptureSourcesCommand(args: string[]): Promise<void> {
  const controller = new AbortController();
  const cancel = () =>
    controller.abort(new Error("Source capture was canceled."));
  const deadline = AbortSignal.timeout(sourceCaptureLimits.deadlineMs);
  // Start before input loading: this signal bounds the complete command.
  const signal = AbortSignal.any([controller.signal, deadline]);
  process.once("SIGINT", cancel);
  process.once("SIGTERM", cancel);
  try {
    const required = ["--repository", "--snapshot", "--request", "--output"];
    const flags = new Map<string, string>();
    for (let index = 1; index < args.length; index += 2) {
      const flag = args[index];
      const value = args[index + 1];
      if (
        !flag ||
        !required.includes(flag) ||
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
    if (required.some((flag) => !flags.has(flag))) {
      throw new Error(
        "Requires --repository, --snapshot, --request, and --output.",
      );
    }
    const request = await readBoundedJson(
      flags.get("--request") ?? "",
      sourceCaptureLimits.maximumRequestBytes,
      signal,
    );
    const snapshot = await readBoundedJson(
      flags.get("--snapshot") ?? "",
      sourceCaptureLimits.maximumSnapshotBytes,
      signal,
    );
    const path = await captureSourcesToDirectory({
      repositoryPath: flags.get("--repository") ?? "",
      outputDirectory: flags.get("--output") ?? "",
      snapshot,
      request,
      signal,
    });
    console.log(`Source capture created: ${path}`);
  } catch (error) {
    const message = signal.aborted
      ? deadline.aborted
        ? "Source capture exceeded its deadline."
        : "Source capture was canceled."
      : error instanceof Error
        ? error.message
        : "Unknown error";
    const code =
      error instanceof RepositoryAnalysisError ? ` (${error.code})` : "";
    console.error(`Source capture failed${code}: ${message.slice(0, 512)}`);
    process.exitCode = 1;
  } finally {
    process.removeListener("SIGINT", cancel);
    process.removeListener("SIGTERM", cancel);
  }
}
