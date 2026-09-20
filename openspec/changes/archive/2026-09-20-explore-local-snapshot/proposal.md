## Why

The analyzer now produces trustworthy local evidence, but its JSON output is not yet a useful starting point for an engineer trying to understand an unfamiliar codebase. This slice turns an existing snapshot into a local, source-cited exploration experience that makes the repository's shape, documentation, and known limits visible before guided learning or AI assistance.

## What Changes

- Add a local snapshot explorer that opens an explicitly selected, schema-valid snapshot without asking the browser to access a repository checkout.
- Present a journey-oriented overview with the recorded revision, inventory/document/history coverage, and omissions or incompleteness before a reader explores individual evidence.
- Let a reader browse recorded files and documentation extracts, filter by path, and inspect extract text alongside its immutable revision, path, and line citation.
- Add deliberate loading, malformed-input, empty-result, and no-selection states so the interface never suggests unavailable evidence exists.
- Keep the miner's field-guide visual language while making dense source evidence calm, readable, keyboard-accessible, and useful at narrow widths.

Non-goals: generating repository explanations, inferring architecture or workflows, opening local checkout files from the browser, persisting snapshots, modifying repositories, transmitting source content, or integrating a model/provider.

## Capabilities

### New Capabilities

- `snapshot-explorer`: Browse an explicitly supplied local evidence snapshot, understand its coverage, and inspect documentation citations without leaving the local application.

### Modified Capabilities

- `workspace-foundation`: The TanStack application becomes a local snapshot explorer rather than a landing shell that only announces analysis availability.

## Impact

- Affected areas: `apps/web`, `packages/contracts`, local development/demo fixtures, browser and unit tests, landing-page copy, and OpenSpec capability specs.
- The application receives a safe, deliberate projection of already-validated snapshot data through a server boundary; the browser never reads repository files or raw arbitrary paths.
- No database, hosted API, external package source, or AI provider is introduced. TanStack Router remains the navigation layer; TanStack Query/Table/Virtual are deferred until observed dataset or async interaction needs require them.
