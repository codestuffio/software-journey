# Software Journey

Understand a repository through its code, documentation, and history. The planned application turns that evidence into developer onboarding, an interactive reference, and focused context for AI agents.

**Current state:** local committed-HEAD repository snapshots are available from the CLI. The browser explorer and tutorial generation remain planned.

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

## Workspace

| Location | Responsibility |
| --- | --- |
| `apps/web` | React application using TanStack Start, Router, and Vite |
| `apps/cli` | Node entry point for local repository analysis |
| `packages/contracts` | Zod-validated snapshot contract and shared vocabulary |
| `packages/typescript-config` | Shared strict TypeScript configuration |
| `packages/repository` | Read-only Git and filesystem analysis boundary |
| `packages/knowledge` | Reserved retrieval/generation boundary, documentation only for now |
| `openspec/specs` | Delivered capability specifications |
| `openspec/changes` | Proposed changes and implementation tasks |
| `docs` | Product direction, architecture, decisions, and research |
| `tests` | Runtime smoke checks |

Turborepo coordinates workspace tasks. Vite bundles TanStack Start. **Do not use Next.js.** TanStack Query, Table, Virtual, and Form can be introduced when a feature needs them; they are not preinstalled without a use case.

## Spec-driven development

Start with [the product direction](docs/product.md) and [architecture](docs/architecture.md). The first proposed feature is [local repository analysis](openspec/changes/analyze-local-repository/proposal.md).

```sh
pnpm spec list
pnpm spec status --change analyze-local-repository
pnpm spec:validate
```

OpenSpec's generated Codex skills are in `.agents/skills`. Use `$openspec-explore` to clarify a feature and `$openspec-propose` to prepare its proposal, specs, design, and tasks. Review those artifacts before applying the feature. Archive verified changes to merge their delta specifications into the delivered specs. The CLI is pinned locally; a global OpenSpec installation is unnecessary.

Set `OPENSPEC_TELEMETRY=0` to disable OpenSpec's CLI usage telemetry. See [OpenSpec's documentation](https://github.com/Fission-AI/OpenSpec).

## Data and licensing

Local-first is a product requirement. Imported repositories and generated knowledge belong under ignored `.software-journey/` or `.local/` directories. Optional hosted AI requires explicit approval before selected snippets leave the machine. The consent UI and exclusion rules will be specified before generation is implemented.

No project license has been selected. Packages are private and marked `UNLICENSED` until the owner chooses distribution terms. Third-party dependencies retain their own licenses.

## GitHub

The intended repository is `codestuffio/software-journey`. The owner will create it manually. See [GitHub setup](docs/github-setup.md) for connecting and pushing this local scaffold.
