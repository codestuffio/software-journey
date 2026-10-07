import { spawn } from "node:child_process";
import { createHash } from "node:crypto";

export const gitTimeoutMs = 60_000;

export class RepositoryAnalysisError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "RepositoryAnalysisError";
  }
}

export interface GitResult {
  stdout: Buffer;
  stderr: string;
}

export function contentIdentity(value: unknown): `sha256:${string}` {
  const canonical = JSON.stringify(value, (_, nestedValue) => {
    if (
      nestedValue &&
      typeof nestedValue === "object" &&
      !Array.isArray(nestedValue)
    ) {
      return Object.fromEntries(
        Object.entries(nestedValue).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      );
    }
    return nestedValue;
  });
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

export function safelyDecodePath(value: Buffer): {
  path: string | null;
  reason: "invalid-path-encoding" | "unsafe-path-character";
} {
  try {
    const decoded = new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: true,
    }).decode(value);
    if (!Buffer.from(decoded).equals(value)) {
      return { path: null, reason: "invalid-path-encoding" };
    }
    if (
      decoded.length === 0 ||
      decoded.includes("\\") ||
      Array.from(decoded).some((character) => {
        const codePoint = character.codePointAt(0);
        return (
          codePoint !== undefined &&
          (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f))
        );
      })
    ) {
      return { path: null, reason: "unsafe-path-character" };
    }
    return { path: decoded, reason: "unsafe-path-character" };
  } catch {
    return { path: null, reason: "invalid-path-encoding" };
  }
}

export function isSafetyExcluded(path: string): boolean {
  const segments = path.toLowerCase().split("/");
  const excludedSegments = new Set([
    "node_modules",
    "vendor",
    "dist",
    "build",
    "coverage",
    ".next",
    ".turbo",
    "target",
    "out",
    "generated",
  ]);
  if (segments.some((segment) => excludedSegments.has(segment))) return true;

  const name = segments.at(-1) ?? "";
  return (
    name === ".env" ||
    name.startsWith(".env.") ||
    name === ".npmrc" ||
    name === "id_rsa" ||
    name === "id_ed25519" ||
    name.includes("credential") ||
    name.includes("secret") ||
    name.endsWith(".pem") ||
    name.endsWith(".key")
  );
}

export async function runGit(
  repositoryPath: string,
  args: string[],
  signal?: AbortSignal,
  maximumBytes?: number,
): Promise<GitResult & { exceededLimit: boolean }> {
  if (signal?.aborted) {
    throw new RepositoryAnalysisError("Analysis was canceled.", "canceled");
  }
  return new Promise((resolveResult, reject) => {
    const child = spawn(
      "git",
      [
        "--no-optional-locks",
        "-c",
        "core.fsmonitor=false",
        "-c",
        "core.hooksPath=/dev/null",
        "-c",
        "diff.external=",
        "-C",
        repositoryPath,
        ...args,
      ],
      {
        env: {
          ...process.env,
          GIT_ATTR_NOSYSTEM: "1",
          GIT_CONFIG_GLOBAL: "/dev/null",
          GIT_CONFIG_NOSYSTEM: "1",
          GIT_TERMINAL_PROMPT: "0",
          GIT_NO_LAZY_FETCH: "1",
          GIT_NO_REPLACE_OBJECTS: "1",
          GIT_LITERAL_PATHSPECS: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const chunks: Buffer[] = [];
    let received = 0;
    let stderr = "";
    let exceededLimit = false;
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
    }, gitTimeoutMs);
    const onAbort = () => child.kill("SIGTERM");
    signal?.addEventListener("abort", onAbort, { once: true });

    child.stdout.on("data", (chunk: Buffer) => {
      received += chunk.length;
      if (maximumBytes !== undefined && received > maximumBytes) {
        exceededLimit = true;
        child.kill("SIGTERM");
        return;
      }
      chunks.push(chunk);
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
      reject(new RepositoryAnalysisError(error.message, "git-unavailable"));
    });
    child.on("close", (code, childSignal) => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
      if (signal?.aborted) {
        reject(
          new RepositoryAnalysisError("Analysis was canceled.", "canceled"),
        );
        return;
      }
      if (exceededLimit) {
        resolveResult({
          stdout: Buffer.concat(chunks),
          stderr,
          exceededLimit: true,
        });
        return;
      }
      if (childSignal === "SIGTERM") {
        reject(
          new RepositoryAnalysisError(
            "Analysis exceeded its 60-second timeout.",
            "timeout",
          ),
        );
        return;
      }
      if (code !== 0) {
        reject(
          new RepositoryAnalysisError(
            stderr.trim() || `Git exited with status ${code ?? "unknown"}.`,
            "git-failed",
          ),
        );
        return;
      }
      resolveResult({
        stdout: Buffer.concat(chunks),
        stderr,
        exceededLimit: false,
      });
    });
  });
}

export async function gitText(
  repositoryPath: string,
  args: string[],
  signal?: AbortSignal,
): Promise<string> {
  const result = await runGit(repositoryPath, args, signal);
  return result.stdout.toString("utf8").trim();
}
