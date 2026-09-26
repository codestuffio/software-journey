import {
  appendFile,
  mkdtemp,
  open,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import {
  loadEvidenceArtifacts,
  readBoundedJson,
} from "../packages/repository/src/artifacts.ts";
import { evidenceFixture } from "./fixtures/retrieval.ts";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, open: vi.fn(actual.open) };
});
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
  vi.clearAllMocks();
});
async function directory() {
  const path = await mkdtemp(join(tmpdir(), "journey-artifacts-"));
  directories.push(path);
  return path;
}
test("bounded reads reject malformed, oversized, missing, non-regular, and invalid UTF-8 inputs", async () => {
  const dir = await directory();
  const path = join(dir, "input.json");
  await writeFile(path, '{"ok":true}');
  await expect(readBoundedJson(path, 11)).resolves.toEqual({ ok: true });
  await expect(readBoundedJson(path, 10)).rejects.toThrow("size limit");
  await expect(readBoundedJson(dir, 100)).rejects.toThrow("regular file");
  await expect(readBoundedJson(join(dir, "absent"), 100)).rejects.toThrow();
  await writeFile(path, "{");
  await expect(readBoundedJson(path, 100)).rejects.toThrow();
  await writeFile(path, Buffer.from([0xff]));
  await expect(readBoundedJson(path, 100)).rejects.toThrow();
});
test("read-time cap catches a file growing after stat and closes the handle", async () => {
  const dir = await directory();
  const path = join(dir, "growing.json");
  await writeFile(path, "1");
  const actual =
    await vi.importActual<typeof import("node:fs/promises")>(
      "node:fs/promises",
    );
  let closed = false;
  vi.mocked(open).mockImplementationOnce(async (...args) => {
    const handle = await actual.open(...args);
    const stat = handle.stat.bind(handle);
    const close = handle.close.bind(handle);
    handle.stat = async () => {
      const before = await stat();
      await appendFile(path, " ".repeat(200));
      return before;
    };
    handle.close = async () => {
      closed = true;
      await close();
    };
    return handle;
  });
  await expect(readBoundedJson(path, 100)).rejects.toThrow("size limit");
  expect(closed).toBe(true);
});
test("artifact loader validates matching files and aborts without mutating them", async () => {
  const dir = await directory();
  const snapshotPath = join(dir, "snapshot.json");
  const bundlePath = join(dir, "workflow.json");
  const input = evidenceFixture();
  const original = JSON.stringify(input.snapshot);
  await writeFile(snapshotPath, original);
  await writeFile(bundlePath, JSON.stringify(input.bundle));
  await expect(
    loadEvidenceArtifacts(snapshotPath, bundlePath),
  ).resolves.toEqual(input);
  await expect(
    loadEvidenceArtifacts(snapshotPath, undefined, AbortSignal.abort()),
  ).rejects.toThrow();
  expect(await readFile(snapshotPath, "utf8")).toBe(original);
  input.bundle.snapshot.contentIdentity = `sha256:${"d".repeat(64)}`;
  await writeFile(bundlePath, JSON.stringify(input.bundle));
  await expect(loadEvidenceArtifacts(snapshotPath, bundlePath)).rejects.toThrow(
    "identity",
  );
});
test("cancellation between file reads closes the open file", async () => {
  const dir = await directory();
  const path = join(dir, "input.json");
  await writeFile(path, "1");
  const actual =
    await vi.importActual<typeof import("node:fs/promises")>(
      "node:fs/promises",
    );
  const controller = new AbortController();
  let closed = false;
  vi.mocked(open).mockImplementationOnce(async (...args) => {
    const handle = await actual.open(...args);
    const stat = handle.stat.bind(handle);
    const close = handle.close.bind(handle);
    handle.stat = async () => {
      const value = await stat();
      controller.abort(new Error("canceled"));
      return value;
    };
    handle.close = async () => {
      closed = true;
      await close();
    };
    return handle;
  });
  await expect(readBoundedJson(path, 100, controller.signal)).rejects.toThrow(
    "canceled",
  );
  expect(closed).toBe(true);
});
