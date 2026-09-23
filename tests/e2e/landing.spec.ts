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
