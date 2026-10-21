# Proposal

## Why

The fifth OpenSpec answer benchmark cannot resolve its historical parser and regression-test citations because snapshots inventory those files without capturing their text. Explicit local source capture would let a reviewer inspect the before/after evidence through the same bounded retrieval used for current questions.

## What Changes

- Add an opt-in `capture-sources` CLI operation that reads exact committed paths and line ranges from a checkout matching a selected snapshot.
- Publish a separate, versioned source-capture artifact bound to that snapshot. Preserve existing snapshots and workflow bundles.
- Let local discovery, retrieval, and answer comparison accept that artifact and disclose missing, excluded, or limited selections.
- Use the existing historical benchmark as acceptance evidence. Captured text can establish citation availability; a human still reviews semantic claims.

This PR proposes the work only. Implementation requires explicit owner approval. Non-goals are automatic whole-repository capture, checkout mutation, fetching missing history, code execution, browser collection, provider requests, and quality or savings claims from collection alone.

## Capabilities

### New Capabilities

- `selected-source-capture`: Bounded committed-source collection from explicit selections into an immutable local artifact.

### Modified Capabilities

- `evidence-retrieval`: Validate and expose an optional matching source-capture artifact through existing path/source selectors.
- `answer-evaluation`: Load source-capture artifacts when checking recorded benchmark citations while preserving review and metric gates.

## Impact

Changes would affect shared contracts, the Node-only repository reader, deterministic knowledge retrieval, CLI argument handling, and answer-evidence manifests. No new service, database, model abstraction, or dependency is proposed. Existing snapshot-only invocations retain their behavior.

Evidence was inspected at Software Journey revision `46abf54fda062ca5f38d62a2d4a6917f74f69263`: `docs/answer-evaluation.md`, `docs/acceptance/answer-evaluation.md`, `packages/repository/src/answer-benchmark.ts:99-113`, and `packages/knowledge/src/answer-evaluation.ts:34-63`. These establish a capture gap, not participant demand or measured savings.

## Acceptance and success measure

After implementation, the historical benchmark's three required parser/test ranges must resolve completely from local validated artifacts after the imported checkout is unavailable. All five benchmark cases must have available citations on the pinned acceptance inputs. Negative fixtures must retain explicit unavailable or partial results, and real quality, token, and cost outcomes remain unmeasured until separate reviewed trials.
