import { journeyRevisionSchema } from "@software-journey/contracts";
import { gitText, isSafetyExcluded, runGit, safelyDecodePath } from "./git.js";

export async function openJourneyReleaseEvidence(
  repository: string,
  revision: string,
) {
  const sha = journeyRevisionSchema.parse(revision);
  const signal = AbortSignal.timeout(60_000);
  const root = await gitText(
    repository,
    ["rev-parse", "--show-toplevel"],
    signal,
  );

  async function files(scopes: string[]) {
    const result = await runGit(
      root,
      ["ls-tree", "-r", "-z", "--full-tree", sha, "--", ...scopes],
      signal,
      1024 * 1024,
    );
    if (result.exceededLimit)
      throw new Error("Chapter evidence listing exceeded 1 MiB.");
    return result.stdout
      .toString("latin1")
      .split("\0")
      .flatMap((entry) => {
        const match = /^100(?:644|755) blob ([a-f0-9]{40,64})\t(.+)$/s.exec(
          entry,
        );
        if (!match?.[1] || !match[2]) return [];
        const { path } = safelyDecodePath(Buffer.from(match[2], "latin1"));
        if (
          !path ||
          isSafetyExcluded(path) ||
          !/\.(?:mdx?|[cm]?[jt]sx?|py|go|rs|rb|java|cs|toml|json|ya?ml|sh|sql|css|html|vue|svelte)$/i.test(
            path,
          )
        )
          return [];
        return [{ path, oid: match[1] }];
      });
  }

  async function read(oid: string) {
    const result = await runGit(
      root,
      ["cat-file", "blob", oid],
      signal,
      64 * 1024,
    );
    if (result.exceededLimit || result.stdout.includes(0)) return null;
    try {
      return new TextDecoder("utf-8", { fatal: true })
        .decode(result.stdout)
        .split(/\r?\n/u);
    } catch {
      return null;
    }
  }

  return { files, read };
}
