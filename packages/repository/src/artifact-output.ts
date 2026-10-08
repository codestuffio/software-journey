import {
  lstat,
  mkdir,
  mkdtemp,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

async function exists(path: string) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
async function canonicalOutput(path: string): Promise<string> {
  const tail: string[] = [];
  let ancestor = resolve(path);
  while (!(await exists(ancestor))) {
    tail.unshift(basename(ancestor));
    const parent = dirname(ancestor);
    if (parent === ancestor) throw new Error("Cannot resolve output parent");
    ancestor = parent;
  }
  return join(await realpath(ancestor), ...tail);
}
async function checkOutput(path: string) {
  let ancestor = path;
  while (true) {
    if (await exists(join(ancestor, ".git")))
      throw new Error("Output must be outside Git checkouts");
    const parent = dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }
}
/** Publish complete JSON once, reserving the destination against concurrent writers. */
export async function writeExclusiveArtifact(
  output: string,
  filename: string,
  text: string,
  signal?: AbortSignal,
  check = () => signal?.throwIfAborted(),
): Promise<string> {
  check();
  const destination = await canonicalOutput(output);
  await checkOutput(destination);
  if (await exists(destination)) throw new Error("Output already exists");
  check();
  await mkdir(dirname(destination), { recursive: true });
  // Reserve the final name exclusively, preventing rename from replacing another output.
  await mkdir(destination);
  let temporary: string | undefined;
  try {
    temporary = await mkdtemp(`${destination}.tmp-`);
    check();
    await writeFile(join(temporary, filename), text, {
      encoding: "utf8",
      signal,
    });
    await new Promise((resolve) => setImmediate(resolve));
    check();
    await rename(temporary, destination);
    check();
    return join(destination, filename);
  } catch (error) {
    if (temporary) await rm(temporary, { recursive: true, force: true });
    await rm(destination, { recursive: true, force: true });
    throw error;
  }
}
