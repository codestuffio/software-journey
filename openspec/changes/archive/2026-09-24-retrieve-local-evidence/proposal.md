# Bounded local evidence retrieval

## Why

Agents currently need to load whole snapshot or workflow files to find a small piece of evidence. R5 gives them a bounded, reproducible way to discover and retrieve captured evidence, and gives future guided lessons the same selection mechanism.

## What Changes

- Add a versioned discovery manifest for captured documentation and optional workflow evidence, with stable selectors, citations, and coverage.
- Add local retrieval by exact path, workflow step, or source reference with an optional line range. Return captured text or recorded history within an explicit byte budget.
- Report uncaptured source, missing ranges, collection omissions, and response truncation without reading the checkout to fill gaps.
- Expose discovery and retrieval as CLI commands returning JSON, using existing artifact files as their only evidence inputs.
- Verify the existing five OpenSpec evidence cases through retrieval, plus synthetic failures and budget boundaries. Measure returned bytes; make no answer-quality or token-savings claim.

Non-goals: automatic architecture inference, free-text or semantic search, new source collection, MCP, hosted providers, generated lessons, databases, embeddings, or browser changes. Guided learning follows as a separate R6 change after retrieval acceptance.

## Capabilities

### New Capabilities

- `evidence-retrieval`: Discover and retrieve bounded, revision-pinned evidence from local artifacts with explicit availability and coverage.

### Modified Capabilities

- `workspace-foundation`: Extend the CLI contract with artifact-only discovery and retrieval commands and machine-readable results.

## Impact

Activate `packages/knowledge` as a private package for deterministic in-memory selection. Extend `packages/contracts`, the Node artifact-reading boundary in `packages/repository`, and `apps/cli`. Add focused contract, retrieval, and CLI tests and a pinned acceptance record. Existing snapshot, workflow, and evaluation formats stay compatible; the current evaluator remains a citation-metadata baseline. No new runtime service or provider dependency is needed.
