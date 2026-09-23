# OpenSpec workflow-trail POC

This acceptance check records one local-only journey for OpenSpec's `new change` workflow. It is intentionally a curated trail, not a claim to map the repository broadly.

## Recorded target

- Checkout: `/Users/adam/Documents/GitHub/OpenSpec`
- Commit: `bae58cf61479986431bb798acbe5a688a591c18c`
- Workflow id: `openspec-new-change`
- Snapshot: `.software-journey/poc/openspec/snapshot.json`

## Recreate

```sh
pnpm build
node apps/cli/dist/index.js trace \
  --repository /Users/adam/Documents/GitHub/OpenSpec \
  --snapshot .software-journey/poc/openspec/snapshot.json \
  --workflow openspec-new-change \
  --output .software-journey/poc/openspec/workflow
```

The command writes the ignored `workflow.json` artifact. It verifies the snapshot and checkout before it reads the catalogued committed paths. It does not execute OpenSpec code, hooks, filters, package scripts, or source-text instructions, and it does not transmit source content.

## Expected observations

The bundle identifies the matching repository identity and commit and records these ordered categories: command, specification, implementation, test, and history. Each source step has a commit, path, line range, and captured text. Open the snapshot in the local explorer, then select `workflow.json` through **Open a workflow trail** to inspect the same evidence without browser access to the checkout.

Generated snapshot and workflow content are ignored by Git; only this procedure, the catalog, tests, and contracts are tracked.

## Verification recorded

On 2026-09-22, `pnpm verify`, `pnpm test:e2e`, and `openspec validate trace-openspec-change-workflow --strict --no-interactive` completed successfully. The generated bundle contained five steps and zero omissions.
