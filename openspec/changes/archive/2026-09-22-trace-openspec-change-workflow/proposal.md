## Why

The explorer can show recorded repository and documentation evidence, but it cannot yet help an engineer follow a real behavior from its command entry point through the specification, implementation, tests, and relevant history. The first OpenSpec proof of concept needs that connective experience while remaining local, revision-pinned, and explicit about what was curated rather than inferred.

## What Changes

- Add a curated, revision-pinned workflow trail for the OpenSpec `new change` flow, packaged as a local workflow bundle containing only the selected evidence excerpts and their immutable source references.
- Add a CLI trace command that verifies a supplied local checkout and snapshot identity, reads only the workflow catalog's declared tracked paths at the selected commit, and writes the bundle atomically without executing repository code or sending source content over a network.
- Extend the explorer so a reader can select a valid workflow bundle and move through its ordered command, specification, implementation, test, and history evidence with coverage and mismatch states visible.
- Record a reproducible OpenSpec POC bundle at the agreed pinned revision and document how to recreate and verify it.
- Keep explanations deterministic: the product-authored step labels describe the bundle structure; source facts remain captured excerpts with citations. No model-generated explanation is introduced.

## Capabilities

### New Capabilities

- `workflow-trail`: Creates and presents a bounded, curated workflow bundle for a supported repository revision.

### Modified Capabilities

- `workspace-foundation`: The local CLI help and command contract gains the supported workflow-trace operation.
- `snapshot-explorer`: The explorer gains local workflow-bundle selection and source-cited workflow navigation.

## Impact

- Affects `apps/cli`, `packages/repository`, `packages/contracts`, and `apps/web`, plus focused unit and browser tests.
- Adds a checked-in workflow catalog containing only product-authored path selections and labels; generated bundles and captured third-party source remain ignored local artifacts.
- Updates the roadmap and POC acceptance documentation. No database, hosted service, repository execution, or AI provider is introduced.
