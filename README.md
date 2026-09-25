# Software Journey

Understand a repository through its code, documentation, and history. The planned application turns that evidence into developer onboarding, an interactive reference, and focused context for AI agents.

**Current state:** local committed-HEAD repository snapshots are available from the CLI and can be explored in the browser. Bounded evidence discovery and retrieval are available from the CLI. A five-step authored OpenSpec lesson is available in the explorer; optional model explanations remain planned.

## Start locally

Use Node 22.23.1 (`nvm use`) and pnpm 11.7.0. If pnpm is missing, install it with `npm install --global pnpm@11.7.0`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000](http://localhost:3000). No credentials or environment file are required.

```sh
pnpm cli --help
pnpm verify
pnpm test:e2e
```

`verify` runs Biome, TypeScript, production builds, Vitest unit tests, CLI/HTTP smoke tests, and strict OpenSpec validation. `test:e2e` runs the Playwright browser suite. Smoke tests start a temporary local server and stop it afterward. For a production-build preview, run `pnpm build` followed by `HOST=127.0.0.1 pnpm --filter @software-journey/web start`.

## Analyze a local checkout

The first MVP reads committed `HEAD` only. It inventories tracked files, extracts bounded Markdown documentation, records recent history and omissions, validates the snapshot with Zod, and writes it atomically outside the target checkout.

```sh
pnpm build
node apps/cli/dist/index.js analyze \
  --repository /Users/you/src/project \
  --output /Users/you/.software-journey/project-snapshot
```

The output is local JSON, not sanitized content. It never executes repository code, Git hooks, or source-text instructions; it does not fetch or upload repository content.

## Explore a snapshot

Open [localhost:3000](http://localhost:3000), choose **Open a local snapshot**, and select the `snapshot.json` written by the CLI. The explorer validates the selected file in the browser, then shows only recorded evidence: collection coverage, omissions, documentation extracts, and immutable source citations. It never reads the selected repository checkout, executes source content, or sends the snapshot to a provider.

The built-in field-guide sample is synthetic. Keep real snapshots—including the OpenSpec POC—under ignored `.software-journey/` or `.local/` directories.

## Learn one workflow

Load the pinned OpenSpec snapshot and matching workflow bundle to open **Your first OpenSpec change**. Follow the five cited evidence steps, answer checkpoints, and draft a first-change plan. You can export your plan and citations locally. Restart or replace an artifact to clear progress. Unsupported revisions and incomplete evidence stay explicit. See [lesson acceptance](docs/acceptance/openspec-lesson.md).

## Evaluate a pinned workflow

The first evaluator is deliberately narrow: it checks five reviewed OpenSpec onboarding questions against a matching snapshot and workflow bundle. It validates immutable source citations and records `passed`, `failed`, or `unavailable` without generating or grading prose.

```sh
node apps/cli/dist/index.js evaluate \
  --repository /Users/you/src/OpenSpec \
  --snapshot /Users/you/.software-journey/openspec/snapshot.json \
  --bundle /Users/you/.software-journey/openspec/workflow/workflow.json \
  --output /Users/you/.software-journey/openspec/evaluation
```

The command writes `evaluation.json` atomically outside the checkout. It neither executes repository code nor sends source or report data over a network.

## Retrieve captured evidence

After building, discover documentation and workflow evidence from local artifacts:

```sh
node apps/cli/dist/index.js context \
  --snapshot .software-journey/poc/openspec/snapshot.json \
  --bundle .software-journey/poc/openspec/workflow/workflow.json \
  --max-bytes 4096
```

Use `nextOffset` with `--offset` to continue discovery over the same artifact identities. The bundle is optional. The manifest describes captured evidence; inventory counts do not imply every source file was captured.

Save this request as `.software-journey/retrieve-request.json`:

```json
{
  "schemaVersion": 1,
  "maxBytes": 4096,
  "selector": {
    "type": "step",
    "workflowId": "openspec-new-change",
    "stepId": "implementation",
    "lines": { "start": 1, "end": 20 }
  }
}
```

```sh
node apps/cli/dist/index.js retrieve \
  --snapshot .software-journey/poc/openspec/snapshot.json \
  --bundle .software-journey/poc/openspec/workflow/workflow.json \
  --request .software-journey/retrieve-request.json
```

For an exact path, use `{"type":"path","path":"README.md"}` as the selector. A source selector adds `type: "source"`, `repositoryId`, and `commitSha` to the path and optional lines. Workflow history steps return commit metadata and do not accept line ranges.

Both commands return one JSON response on stdout. Valid partial or unavailable evidence exits zero; invalid flags, inputs, identity mismatches, cancellation, and budget errors exit nonzero with diagnostics on stderr. The complete response, including metadata and newline, defaults to 32,768 UTF-8 bytes; supported budgets are 4,096–262,144 bytes. Artifact inputs are limited to 32 MiB each and request files to 16 KiB. Operations have a 10-second deadline.

Retrieval reads only these selected files. It does not need the checkout, run Git, execute captured text, or use a network. Uncaptured source and missing lines stay explicit. Reports describe evidence and byte usage, not semantic answer quality or token savings. See the [pinned retrieval acceptance](docs/acceptance/openspec-retrieval.md).

## Workspace

| Location | Responsibility |
| --- | --- |
| `apps/web` | React application using TanStack Start, Router, and Vite |
| `apps/cli` | Node entry point for local repository analysis |
| `packages/contracts` | Zod-validated snapshot contract and shared vocabulary |
| `packages/typescript-config` | Shared strict TypeScript configuration |
| `packages/repository` | Read-only Git and filesystem analysis boundary |
| `packages/knowledge` | Deterministic discovery and bounded retrieval over validated artifacts |
| `openspec/specs` | Delivered capability specifications |
| `openspec/changes` | Proposed changes and implementation tasks |
| `docs` | Product direction, architecture, decisions, and research |
| `tests` | Runtime smoke checks |

Turborepo coordinates workspace tasks. Vite bundles TanStack Start. **Do not use Next.js.** TanStack Query, Table, Virtual, and Form can be introduced when a feature needs them; they are not preinstalled without a use case.

## Spec-driven development

Start with [the product direction](docs/product.md) and [architecture](docs/architecture.md). Completed capabilities are recorded in [the delivered specs](openspec/specs/). The implemented [retrieve-local-evidence change](openspec/changes/archive/2026-09-24-retrieve-local-evidence/proposal.md) is archived; the [roadmap](docs/roadmap.md) tracks the next assisted-explanation feature.

```sh
pnpm spec list
pnpm spec list --specs
pnpm spec:validate
```

OpenSpec's generated Codex skills are in `.agents/skills`. Use `$openspec-explore` to clarify a feature and `$openspec-propose` to prepare its proposal, specs, design, and tasks. Review those artifacts before applying the feature. Archive verified changes to merge their delta specifications into the delivered specs. The CLI is pinned locally; a global OpenSpec installation is unnecessary.

Set `OPENSPEC_TELEMETRY=0` to disable OpenSpec's CLI usage telemetry. See [OpenSpec's documentation](https://github.com/Fission-AI/OpenSpec).

## Data and licensing

Local-first is a product requirement. Imported repositories and generated knowledge belong under ignored `.software-journey/` or `.local/` directories. Optional hosted AI requires explicit approval before selected snippets leave the machine. The consent UI and exclusion rules will be specified before generation is implemented.

No project license has been selected. Packages are private and marked `UNLICENSED` until the owner chooses distribution terms. Third-party dependencies retain their own licenses.

## GitHub

The intended repository is `codestuffio/software-journey`. The owner will create it manually. See [GitHub setup](docs/github-setup.md) for connecting and pushing this local scaffold.
