import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import { runJourneyReleaseCommand } from "../apps/cli/src/journey-release.ts";
import { releaseEligible } from "../apps/cli/src/journey-release-policy.ts";

test("release policy defaults to majors and supports exact overrides and prereleases", () => {
  expect(releaseEligible("v2.0.0", false, {})).toBe(true);
  for (const tag of [
    "2.1.0",
    "2.0.1",
    "2.0.0-rc.1",
    "journey-walkthrough-v1",
    "2.0.0\n",
    "02.0.0",
    "2.0.0-01",
  ]) {
    expect(releaseEligible(tag, false, {})).toBe(false);
  }
  expect(releaseEligible("2.0.0", true, {})).toBe(false);
  expect(releaseEligible("2.1.0", false, { types: "major, minor" })).toBe(true);
  expect(releaseEligible("2.0.0-rc.1", false, { types: "prerelease" })).toBe(
    true,
  );
  expect(
    releaseEligible("v2.1.3", false, { types: "none", include: "2.1.3" }),
  ).toBe(true);
  expect(
    releaseEligible("2.1.3", false, { include: "2.1.3", exclude: "v2.1.3" }),
  ).toBe(false);
  expect(() => releaseEligible("v2.0.0", false, { types: "feature" })).toThrow(
    "JOURNEY_RELEASE_TYPES",
  );
});

test("approved release updates the affected chapter and preserves verified chapter output", async () => {
  const temp = await mkdtemp(join(tmpdir(), "sj-release-"));
  const repo = join(temp, "repo");
  const output = join(temp, "output");
  const slug = "example/project";
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
  const commit = () => {
    git(
      "add",
      ".github/journey-chapters.json",
      "overview.md",
      "billing.ts",
      "history.md",
      "learning.ts",
    );
    git(
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.test",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "-qm",
      "Fixture",
    );
    return git("rev-parse", "HEAD");
  };
  const chapters = [
    { id: "overview", title: "Overview", paths: ["overview.md"] },
    { id: "billing", title: "Billing", paths: ["billing.ts"] },
    { id: "history", title: "History", paths: ["history.md"] },
    { id: "learning", title: "Learning", paths: ["learning.ts"] },
  ];
  const draft = (citations: number[]) =>
    Response.json({
      model: "claude-haiku-5-5",
      stop_reason: "end_turn",
      content: [
        {
          type: "text",
          text: JSON.stringify({
            blocks: [{ text: "Updated overview.", citations }],
          }),
        },
      ],
    });
  const transport = vi.fn<typeof fetch>(async () => draft([1]));
  const getApiKey = vi.fn(() => "fixture-key");
  const federatedAuth = vi.fn(async () => ({
    Authorization: "Bearer fixture-token",
  }));
  const deps = { transport, getApiKey, federatedAuth };
  const metadata = (markdown: string) => {
    const embedded = markdown.match(/software-journey:v1 (\S+) -->/)?.[1];
    if (!embedded) throw new Error("Missing walkthrough metadata.");
    return JSON.parse(Buffer.from(embedded, "base64").toString("utf8"));
  };
  const approval = (summary: string) =>
    summary.match(/Approval digest `([a-f0-9]{64})`/)?.[1];

  try {
    await mkdir(join(repo, ".github"), { recursive: true });
    await mkdir(output);
    git("init", "-q");
    await writeFile(
      join(repo, ".github/journey-chapters.json"),
      JSON.stringify({ schemaVersion: 1, chapters }),
    );
    for (const chapter of chapters)
      await writeFile(
        join(repo, chapter.paths[0] ?? ""),
        `${chapter.title} source\n`,
      );
    const baselineRevision = commit();
    const seedNotes = join(temp, "seed.md");
    await writeFile(
      seedNotes,
      chapters
        .map(
          ({ title, paths }) =>
            `## ${title}\n\nOriginal ${title} chapter.\n\n[Source](https://github.com/${slug}/blob/${baselineRevision}/${paths[0]}#L1-L1)`,
        )
        .join("\n\n"),
    );
    await writeFile(
      join(repo, "overview.md"),
      "Overview source\nNew release instructions\n",
    );
    const revision = commit();
    await writeFile(join(repo, "overview.md"), "Unsaved changes\n");
    const options = {
      repository: repo,
      repo: slug,
      revision,
      releaseId: "42",
      tag: "v2.0.0",
      prerelease: false,
      baselineRevision,
      seedNotes,
      output,
      policy: {},
    };
    const preview = await runJourneyReleaseCommand(options, deps);
    expect(preview.summary).toContain("Updates (1) · Reused (3)");
    expect(getApiKey).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
    expect(federatedAuth).not.toHaveBeenCalled();

    const request = JSON.parse(
      await readFile(join(output, "approval.json"), "utf8"),
    );
    expect(request.chapters[0].request.body.messages[0].content).toContain(
      "New release instructions",
    );
    expect(request.chapters[0].request.body.max_tokens).toBe(2000);
    expect(request.chapters[0].request.body.system).toContain(
      "at most 70 words",
    );
    expect(JSON.stringify(request)).not.toContain("Unsaved changes");
    expect(
      request.chapters
        .slice(1)
        .every((item: { reused: unknown }) => item.reused),
    ).toBe(true);
    const approved = { ...options, approval: approval(preview.summary) };

    await expect(
      runJourneyReleaseCommand({ ...approved, releaseId: "43" }, deps),
    ).rejects.toThrow("Approval digest changed");
    expect(getApiKey).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
    expect(federatedAuth).not.toHaveBeenCalled();

    transport.mockResolvedValueOnce(
      new Response("Untrusted response content", {
        status: 400,
        headers: { "request-id": "req_fixture" },
      }),
    );
    await expect(runJourneyReleaseCommand(approved, deps)).rejects.toThrow(
      "Messages returned HTTP 400. Request ID req_fixture.",
    );

    transport.mockResolvedValueOnce(
      Response.json({
        model: "claude-haiku-5-5",
        stop_reason: "max_tokens",
        content: [{ type: "text", text: '{"blocks":[' }],
      }),
    );
    await expect(runJourneyReleaseCommand(approved, deps)).rejects.toThrow(
      "The response stopped with max_tokens.",
    );
    await expect(
      readFile(join(output, "software-journey.md")),
    ).rejects.toMatchObject({ code: "ENOENT" });

    transport.mockImplementationOnce(async () => draft([99]));
    await expect(runJourneyReleaseCommand(approved, deps)).rejects.toThrow(
      "outside the approved request",
    );
    await expect(
      readFile(join(output, "software-journey.md")),
    ).rejects.toMatchObject({ code: "ENOENT" });

    transport.mockClear();
    await runJourneyReleaseCommand(approved, deps);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer fixture-token",
    });
    expect(transport.mock.calls[0]?.[1]?.headers).not.toHaveProperty(
      "x-api-key",
    );
    expect(transport.mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify(request.chapters[0].request.body),
    );
    const asset = join(output, "software-journey.md");
    const publication = metadata(await readFile(asset, "utf8"));
    expect(publication.chapters[0].blocks[0].sources[0].revision).toBe(
      revision,
    );
    expect(publication.chapters.slice(1)).toEqual(
      request.chapters.slice(1).map((item: { reused: unknown }) => item.reused),
    );

    const next = join(temp, "next");
    await mkdir(next);
    transport.mockClear();
    getApiKey.mockClear();
    federatedAuth.mockClear();
    const nextOptions = {
      ...options,
      releaseId: "44",
      tag: "v3.0.0",
      output: next,
      baselineRevision: revision,
      baselineAsset: asset,
      seedNotes: undefined,
    };
    const allReused = await runJourneyReleaseCommand(nextOptions, deps);
    expect(allReused.summary).toContain("Updates (0) · Reused (4)");
    await runJourneyReleaseCommand(
      { ...nextOptions, approval: approval(allReused.summary) },
      deps,
    );
    expect(
      metadata(await readFile(join(next, "software-journey.md"), "utf8")),
    ).toEqual(publication);
    expect(transport).not.toHaveBeenCalled();
    expect(federatedAuth).not.toHaveBeenCalled();
    expect(getApiKey).not.toHaveBeenCalled();

    const stale = join(temp, "stale");
    await mkdir(stale);
    await writeFile(join(repo, "billing.ts"), "Changed billing rules\n");
    const changed = commit();
    await expect(
      runJourneyReleaseCommand(
        {
          ...nextOptions,
          output: stale,
          revision: changed,
          approval: approval(allReused.summary),
        },
        deps,
      ),
    ).rejects.toThrow("Approval digest changed");
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}, 20_000);
