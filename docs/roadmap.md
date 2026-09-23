# Product roadmap

Software Journey helps developers and AI agents understand a repository from evidence they can inspect. This roadmap orders independently demonstrable milestones. It is a planning guide, not a contract for delivered behavior; OpenSpec capability specs remain the source of truth for implementation.

## Working rules

- Build one milestone slice at a time. A slice needs a usable outcome, a clear scope boundary, and acceptance evidence.
- Create an OpenSpec change before implementing a new user-visible capability or changing an established behavior.
- Keep a roadmap entry broad. Requirements, design decisions, and implementation tasks belong in its linked change.
- Mark an entry done only when its acceptance evidence is recorded and its capability specs match the implementation.

## Now: prove the evidence pipeline

| ID | Milestone | Outcome | Scope boundary | Depends on | Status | OpenSpec change |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | Local repository evidence | A user can create a deterministic, bounded snapshot of a committed local checkout and see its coverage. | No model calls, remote cloning, code execution, or web explorer. | — | complete | Archived 2026-09-20 |

**Exit evidence:** synthetic repositories demonstrate exclusions, source references, bounded history, failure handling, and deterministic output. A pinned OpenSpec checkout produces a snapshot with manually resolvable sample citations.

## Next: make evidence explorable

| ID | Milestone | Outcome | Scope boundary | Depends on | Status | OpenSpec change |
| --- | --- | --- | --- | --- | --- | --- |
| R2 | Snapshot explorer | A developer can open a local snapshot, browse repository and documentation evidence, and inspect cited paths. | No generated tutorial content or agent-facing protocol. | R1 | complete | [`Archived 2026-09-20`](../openspec/changes/archive/2026-09-20-explore-local-snapshot/) |
| R3 | Workflow trail | A developer can follow one real workflow through entry point, specification, implementation, tests, and selected history. | One curated workflow per snapshot; no broad architecture inference claims. | R2 | in progress | [`trace-openspec-change-workflow`](../openspec/changes/trace-openspec-change-workflow/) |
| R4 | Evidence evaluation baseline | The project can measure citation validity and answer quality for fixed repository questions. | Evaluation harness and curated answers only; no provider integration required. | R1, R3 | planned | — |

**Exit evidence:** the pinned OpenSpec demonstration supports a developer tracing one workflow in the interface. The evaluation set records expected answers and resolvable evidence at a fixed revision.

## Later: assist learning and agent work

| ID | Milestone | Outcome | Scope boundary | Depends on | Status | OpenSpec change |
| --- | --- | --- | --- | --- | --- | --- |
| R5 | Bounded agent retrieval | An agent can request versioned repository context by area or source reference, with coverage and truncation metadata. | No MCP transport until the retrieval contract proves useful. | R1, R4 | planned | — |
| R6 | Guided learning | A developer can work through evidence-backed tutorial steps and deeper explanations. | Generated explanations remain optional and clearly distinguish facts, quotes, inference, and unknowns. | R3, R4 | planned | — |
| R7 | Optional assisted explanations | A user can approve selected source snippets for a provider-backed explanation with a visible cost and cancellation boundary. | No automatic source transfer, accounts, or multi-tenant service. | R4, R6 | planned | — |

**Exit evidence:** fixed evaluation tasks show that retrieval or assisted explanations preserve answer quality and citation validity. Agent requests expose their revision, coverage, truncation, latency, and cost where applicable.

## Deferred scaling work

| ID | Milestone | Outcome | Scope boundary | Depends on | Status | OpenSpec change |
| --- | --- | --- | --- | --- | --- | --- |
| R8 | Larger local repositories | The analyzer and explorer remain responsive within published limits on representative large repositories. | Add indexing, storage, or background work only when measurements justify them. | R1, R2 | deferred | — |
| R9 | Shared or hosted use | Teams can use a managed service with deliberate identity, storage, privacy, and operational boundaries. | No accounts, billing, continuous indexing, or hosted ingestion before a separate product decision. | R5, R7, R8 | deferred | — |

## Architecture triggers

Keep the current modular local application while the product proves its workflow. Revisit infrastructure only when evidence calls for it:

| Trigger | Next decision |
| --- | --- |
| Snapshot queries become complex or slow with versioned files | Evaluate SQLite as the local snapshot index. |
| Analysis makes the interface unresponsive or requires independent cancellation | Specify a local worker boundary and job lifecycle. |
| Retrieval evaluations show path and text search are insufficient | Specify a retrieval index with evaluation gates before adding embeddings. |
| Multiple users need shared, concurrent writes or hosted snapshots | Specify service ownership, a client/server database, identity, and durable jobs together. |
| Provider requests need repeatability or cost control | Specify consent, budgets, idempotency, timeouts, cancellation, and audit metadata. |

## Review cadence

Review this roadmap at the end of each completed milestone and when an active change changes a milestone boundary. Update the roadmap first when scope shifts, then reconcile linked OpenSpec changes.
