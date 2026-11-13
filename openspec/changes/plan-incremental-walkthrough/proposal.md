## Why

A PR into the walkthrough branch should show which parts of the existing walkthrough still apply and what a selective update would cost.

## What Changes

- Run an incremental plan for same-repository PRs from main into journey.
- Compare declared chapter evidence at the proposed merge and a baseline revision. Report reuse candidates, updates, removals, and estimated tokens and model cost before generation.

## Capabilities

### New Capabilities

- `incremental-walkthrough`: Produce a deterministic chapter change plan for a pull request.

## Impact

Adds a read-only CLI command, a chapter catalog, and a GitHub Actions run summary. The planner does not generate or publish walkthroughs, call a model, or store excerpts.
