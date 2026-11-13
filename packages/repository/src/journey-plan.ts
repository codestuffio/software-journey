import {
  journeyCatalogPath,
  journeyCatalogSchema,
  journeyRevisionSchema,
} from "@software-journey/contracts";
import { gitText, RepositoryAnalysisError, runGit } from "./git.js";

export async function readJourneyPlanEvidence(
  repositoryPath: string,
  baselineValue: string,
  targetValue: string,
) {
  const baseline = journeyRevisionSchema.parse(baselineValue);
  const target = journeyRevisionSchema.parse(targetValue);
  const root = await gitText(repositoryPath, ["rev-parse", "--show-toplevel"]);
  const signal = AbortSignal.timeout(30_000);

  async function treeEntries(revision: string, paths: string[]) {
    const entries = new Map<string, { mode: string; oid: string }>();
    if (paths.length === 0) return entries;
    const { stdout, exceededLimit } = await runGit(
      root,
      [
        "--literal-pathspecs",
        "ls-tree",
        "-t",
        "-z",
        "--full-tree",
        revision,
        "--",
        ...paths,
      ],
      signal,
      1024 * 1024,
    );
    if (exceededLimit) throw new Error("Chapter tree listing exceeded 1 MiB.");
    const wanted = new Set(paths);
    for (const record of stdout.toString("utf8").split("\0")) {
      if (!record) continue;
      const match = /^(\d{6}) \w+ ([a-f0-9]+)\t(.+)$/s.exec(record);
      if (!match) throw new Error("Could not verify a Git tree entry.");
      const [, mode, oid, path] = match;
      if (path && mode && oid && wanted.has(path))
        entries.set(path, { mode, oid });
    }
    return entries;
  }

  async function readCatalog(revision: string) {
    const verified = await gitText(
      root,
      [
        "rev-parse",
        "--verify",
        "--quiet",
        "--end-of-options",
        `${revision}^{commit}`,
      ],
      signal,
    ).catch((error: unknown) => {
      if (
        error instanceof RepositoryAnalysisError &&
        error.code === "git-failed"
      )
        return null;
      throw error;
    });
    if (verified !== revision)
      throw new Error(
        `Walkthrough commit ${revision} is unavailable. Check the revision and checkout history.`,
      );
    const entry = (await treeEntries(revision, [journeyCatalogPath])).get(
      journeyCatalogPath,
    );
    if (!entry) return null;
    if (entry.mode !== "100644" && entry.mode !== "100755")
      throw new Error("The chapter catalog must be a committed regular file.");
    const { stdout, exceededLimit } = await runGit(
      root,
      ["cat-file", "blob", entry.oid],
      signal,
      64 * 1024,
    );
    if (exceededLimit) throw new Error("The chapter catalog exceeded 64 KiB.");
    try {
      return journeyCatalogSchema.parse(
        JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(stdout)),
      );
    } catch {
      throw new Error(
        `Invalid chapter catalog at ${revision}. Check the schema, IDs, titles, and paths in ${journeyCatalogPath}.`,
      );
    }
  }

  const [previous, proposed] = await Promise.all([
    readCatalog(baseline),
    readCatalog(target),
  ]);
  if (!proposed) throw new Error(`Target commit has no ${journeyCatalogPath}.`);
  const paths = [
    ...new Set(proposed.chapters.flatMap((chapter) => chapter.paths)),
  ];
  const [before, after] = await Promise.all([
    treeEntries(baseline, paths),
    treeEntries(target, paths),
  ]);
  return { baseline, target, previous, proposed, before, after };
}
