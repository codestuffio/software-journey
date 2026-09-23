## 1. Workflow contract and reviewed catalog

- [x] 1.1 Add versioned workflow-bundle schemas, limits, provenance, coverage, and bounded browser projection in `packages/contracts`; verify focused contract tests accept the supported shape and reject malformed, mismatched, and over-limit input.
- [x] 1.2 Add the reviewed OpenSpec `new change` catalog entry pinned to `bae58cf61479986431bb798acbe5a688a591c18c`, with command, specification, implementation, test, and history selectors; verify a test asserts the exact declared paths and step ordering.

## 2. Deterministic local bundle capture

- [x] 2.1 Extend `packages/repository` with a trace collector that validates the supplied snapshot, checkout identity, catalog revision, and output boundary before reading Git objects; verify tests cover the supported workflow and each identity/revision/output rejection scenario.
- [x] 2.2 Capture only catalogued committed objects and selected history into an atomic workflow bundle with source line ranges and explicit coverage records; verify tests cover missing, non-text, and truncated evidence plus cancellation cleanup.
- [x] 2.3 Add the `trace` CLI command and help text with required repository, snapshot, workflow, and output inputs; verify CLI tests cover help, valid invocation, missing flags, unsupported workflow, and no-network/no-execution messaging.

## 3. Explorer workflow experience

- [x] 3.1 Add local workflow-bundle selection and schema/matching validation to the snapshot explorer without adding browser checkout or network access; verify unit tests preserve the active snapshot when the bundle is malformed or mismatched.
- [x] 3.2 Build the ordered mining-field-guide workflow trail and evidence detail state, distinguishing catalog labels, captured excerpts, citations, history metadata, and incomplete steps; verify focused component behavior for every step category and coverage warning.
- [x] 3.3 Extend Playwright coverage for selecting a valid bundle, traversing its evidence, and handling malformed, mismatched, and incomplete bundles; verify the browser suite passes against the production build.

## 4. OpenSpec POC and release verification

- [x] 4.1 Generate the ignored OpenSpec workflow bundle from `/Users/adam/Documents/GitHub/OpenSpec` at the pinned commit and document the reproducible command, expected categories, and acceptance observations in `docs/acceptance`; verify no captured third-party source is tracked by Git.
- [x] 4.2 Update R3 status and links in `docs/roadmap.md` to reflect the active workflow-trail change; verify the roadmap points at the change and retains R2's completed archive reference.
- [x] 4.3 Run `pnpm verify`, `pnpm test:e2e`, and `openspec validate trace-openspec-change-workflow --strict --no-interactive`; record successful checks in the acceptance document.
