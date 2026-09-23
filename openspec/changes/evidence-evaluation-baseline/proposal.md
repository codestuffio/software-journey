## Why

Software Journey can now collect and present a real workflow, but has no repeatable way to tell whether its evidence answers onboarding questions correctly. A small pinned evaluation set creates a trustworthy baseline before retrieval or generated explanations are considered.

## What Changes

- Add a local, versioned evaluation set for five fixed OpenSpec questions: entry point, execution path, governing specification, validating test, and relevant history.
- Add a deterministic evaluator that validates expected source citations against a selected snapshot and reports per-question pass/fail, coverage, and unresolved evidence.
- Add a CLI command and acceptance record for producing a local evaluation report; no model, network call, or source upload is introduced.

## Capabilities

### New Capabilities

- `evidence-evaluation`: Defines fixed local evaluation cases and reproducible citation-validity reports for a pinned repository revision.

### Modified Capabilities

- `workspace-foundation`: The CLI help and command contract gains the supported local evidence-evaluation operation.

## Impact

- Affects contracts, the local repository/CLI boundary, focused tests, and acceptance documentation.
- Adds checked-in question and expected-citation metadata only; snapshots, reports, and third-party source remain ignored local artifacts.
