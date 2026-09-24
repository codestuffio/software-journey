import { expect, test } from "@playwright/test";

test("explorer makes recorded evidence and its limits visible", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Know the ground before you explore." }),
  ).toBeVisible();
  await expect(page.getByText("History: limited")).toBeVisible();
  await expect(page.getByText("history-limit")).toBeVisible();
  await expect(
    page.getByText("Captured text — display-only evidence"),
  ).toBeVisible();

  await page.getByRole("button", { name: "docs/contributing.md" }).click();
  await expect(
    page.getByRole("heading", { name: "docs/contributing.md" }),
  ).toBeVisible();
  await expect(page.getByText("Lines 20–29")).toBeVisible();
});

test("explorer preserves an empty filter state at a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByLabel("Filter recorded paths").fill("nothing-here");
  await expect(
    page.getByText("No recorded evidence matches this path."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Choose a field note." }),
  ).toBeVisible();
});

test("explorer follows a matching local workflow bundle", async ({ page }) => {
  const sha = "f".repeat(40);
  const identity = `sha256:${"c".repeat(64)}`;
  await page.goto("/");
  await page
    .getByLabel("Choose a local workflow bundle JSON file")
    .setInputFiles({
      name: "trail.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          schemaVersion: 1,
          contentIdentity: identity,
          workflow: { id: "demo-change", catalogVersion: "1" },
          snapshot: {
            contentIdentity: identity,
            repository: { id: identity, headCommit: sha },
          },
          collectedAt: "2026-09-20T00:00:02.000Z",
          steps: [
            {
              id: "command",
              kind: "command",
              label: "Command entry",
              evidence: {
                type: "source",
                contentId: identity,
                source: {
                  repositoryId: identity,
                  commitSha: sha,
                  path: "src/cli.ts",
                  lines: { start: 1, end: 1 },
                },
                text: "export const newChange = true;",
              },
            },
          ],
          omissions: [],
        }),
      ),
    });
  await expect(page.getByText("1 steps recorded")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Command entry" }),
  ).toBeVisible();
  await expect(page.getByText("src/cli.ts")).toBeVisible();
});

test("explorer keeps the active snapshot when a workflow bundle mismatches", async ({
  page,
}) => {
  await page.goto("/");
  const sha = "e".repeat(40);
  const identity = `sha256:${"d".repeat(64)}`;
  await page
    .getByLabel("Choose a local workflow bundle JSON file")
    .setInputFiles({
      name: "wrong-trail.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          schemaVersion: 1,
          contentIdentity: identity,
          workflow: { id: "wrong", catalogVersion: "1" },
          snapshot: {
            contentIdentity: identity,
            repository: { id: identity, headCommit: sha },
          },
          collectedAt: "2026-09-20T00:00:02.000Z",
          steps: [
            {
              id: "history",
              kind: "history",
              label: "History",
              evidence: {
                type: "history",
                commit: {
                  sha,
                  parentShas: [],
                  authoredAt: "2026-09-20T00:00:00.000Z",
                  subject: "Different revision",
                },
              },
            },
          ],
          omissions: [],
        }),
      ),
    });
  await expect(page.getByRole("alert")).toContainText(
    "different snapshot revision",
  );
  await expect(page.getByText("History: limited")).toBeVisible();
});

test("Learning guides a matching workflow with labeled claims and citations", async ({
  page,
}) => {
  const repositoryId =
    "sha256:eee892b5859866adf340033826fac3acb4ab68c1ed787676a313a00e8ac5d325";
  const commitSha = "bae58cf61479986431bb798acbe5a688a591c18c";
  const snapshotIdentity = `sha256:${"a".repeat(64)}`;
  const bundleIdentity = `sha256:${"b".repeat(64)}`;
  const demo = await import("../../apps/web/src/demo-snapshot.ts");
  const snapshot = {
    ...demo.demoSnapshot,
    contentIdentity: snapshotIdentity,
    repository: { id: repositoryId, headCommit: commitSha },
  };
  const paths = [
    ["command-entry", "src/cli/index.ts"],
    ["governing-specification", "openspec/specs/change-creation/spec.md"],
    ["implementation", "src/commands/workflow/new-change.ts"],
    ["test", "test/cli-e2e/basic.test.ts"],
  ];
  const workflow = {
    schemaVersion: 1,
    contentIdentity: bundleIdentity,
    workflow: { id: "openspec-new-change", catalogVersion: "1" },
    snapshot: {
      contentIdentity: snapshotIdentity,
      repository: snapshot.repository,
    },
    collectedAt: "2026-09-20T00:00:02.000Z",
    steps: paths.map(([id, path], index) => ({
      id,
      kind: "implementation",
      label: id,
      evidence: {
        type: "source",
        contentId: `sha256:${(index + 1).toString(16).repeat(64)}`,
        source: { repositoryId, commitSha, path, lines: { start: 1, end: 3 } },
        text: `Captured ${id} evidence`,
      },
    })),
    omissions: [],
  };
  await page.goto("/");
  await page.getByLabel("Choose a local snapshot JSON file").setInputFiles({
    name: "snapshot.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(snapshot)),
  });
  await page
    .getByLabel("Choose a local workflow bundle JSON file")
    .setInputFiles({
      name: "workflow.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(workflow)),
    });
  await page.getByRole("button", { name: "Learning" }).click();
  await expect(
    page.getByRole("heading", { name: "Find the command entry" }),
  ).toBeVisible();
  await expect(
    page.getByText("Inference · authored explanation"),
  ).toBeVisible();
  await page.getByText("View cited source evidence").first().click();
  await expect(
    page.getByText("Captured command-entry evidence").first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "2. Read the governing specification" })
    .click();
  await expect(page.getByText("Quoted documentation")).toBeVisible();
  await expect(page.getByText("Unknown", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Read the governing specification" }),
  ).toBeVisible();
  const wrongCitationWorkflow = {
    ...workflow,
    steps: workflow.steps.map((step) =>
      step.id === "governing-specification"
        ? {
            ...step,
            evidence: {
              ...step.evidence,
              source: { ...step.evidence.source, path: "docs/other.md" },
            },
          }
        : step,
    ),
  };
  await page
    .getByLabel("Choose a local workflow bundle JSON file")
    .setInputFiles({
      name: "wrong-citation.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(wrongCitationWorkflow)),
    });
  await page
    .getByRole("button", { name: "2. Read the governing specification" })
    .click();
  await expect(page.getByText("Quoted evidence is unavailable.")).toBeVisible();
  await expect(
    page.getByText("Some citations are unavailable or invalid.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "1. Find the command entry" }).click();
  await expect(
    page.getByText("Some citations are unavailable or invalid.", {
      exact: false,
    }),
  ).toHaveCount(0);
  await page
    .getByLabel("Choose a local workflow bundle JSON file")
    .setInputFiles({
      name: "wrong-workflow.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          ...workflow,
          snapshot: {
            ...workflow.snapshot,
            repository: {
              ...workflow.snapshot.repository,
              headCommit: "f".repeat(40),
            },
          },
        }),
      ),
    });
  await expect(page.getByRole("alert")).toContainText(
    "different snapshot revision",
  );
  await expect(
    page.getByRole("heading", { name: "Read the governing specification" }),
  ).toHaveCount(0);
});
