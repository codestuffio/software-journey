# Design

## Context

At revision c71a275, `packages/repository/src/evaluation-catalog.ts` names five citation cases; the fifth is revision anchoring. `tests/acceptance/retrieval.mjs` measures exact captured-text equality, response bytes, and retrieval elapsed time. Neither grades answers. See proposal.md for motivation and the answer-evaluation delta for the new contract.

## Goals / Non-Goals

**Goals:** additive offline reporting, separately attributable human judgments, repeatable paired comparisons, and an honest unavailable state for historical evidence.

**Non-Goals:** changing `evaluate`, automating participants or models, importing repository source into Git, adding browser UI, or treating simulated answers as real efficacy trials.

## Decisions

### Use a separate benchmark and report command

Add `compare-answers --benchmark <file> --trials <file> --assessments <file> --evidence <manifest-file> --output <directory>`. Version-1 benchmark, trial, assessment, and evidence-manifest contracts live in contracts. A manifest names explicit snapshot/bundle files and their expected content identities for each revision. All paths are resolved relative to the selected manifest, validated as regular files, and never derived from captured source text.

Snapshot repository IDs are hashes of the committed HEAD and tree, so they differ across revisions. The benchmark declares an explicit revision-to-repository-ID mapping and validates every citation against it; the primary repositoryId names the pinned workflow snapshot. These mappings are reviewed metadata, not proof of shared lineage.

Keep the current citation evaluator unchanged to avoid reinterpreting its existing passes. A separate benchmark covers entry point, execution path, governing spec, validating tests, and historical behavior change. Reference answers remain local; tracked catalog metadata contains question IDs and source references without upstream extracts.

### Separate loading, citation checks, and judgments

Repository owns bounded file reads and atomic report writing using existing patterns; knowledge owns pure normalization, captured-evidence citation checks, and pairing. The CLI composes them. No Git call occurs during report assembly; references outside captured evidence remain unavailable. Human judgments carry reviewer ID, rubric version, reasons, and canonical answer/benchmark content digests. Digests detect stale bindings, not authenticity or reviewer authority. Resolved quotations and citations establish support availability, not truth of an answer.

A trial records case ID, arm, repetition ID, participant kind/configuration, revisions, declared context/output/time budgets, answer content and citations, real/synthetic provenance, and metrics. Pair on these declared fields; missing or conflicting fields are not silently normalized into a match. A real, reviewed pair qualifies only when both answers meet every required dimension and required evidence resolves. Report per-pair differences and counts; do not turn a small sample into a universal conclusion. Metrics include scope (for example tool-response bytes versus total input bytes); compare only like scopes. Unknown metrics stay null with reasons.

### Curate history without inventing a new ingestion system

During implementation inspect only local committed Git objects around the pinned OpenSpec workflow. Identify one before/after change using code, governing spec where present, and tests. Do not execute imported code, hooks, or instructions. Record exact SHAs and line ranges in a reviewed local reference artifact. Generate separate committed-HEAD snapshots from isolated local checkouts of those revisions using the existing analyzer; use captured documentation as available. If the current collector cannot capture required historical code, report the historical benchmark case unavailable and document the exact capture gap. A later collection change is required before that case can support a passing comparison. Do not widen retrieval or misrepresent history metadata to force completion.

### Bound processing and preserve local privacy

Limit each benchmark/trial/assessment/manifest JSON input to 1 MiB, each named evidence artifact to the existing 32 MiB bound, combined evidence to 128 MiB, and output to 4 MiB. Limit 20 cases and 100 trial records; reject duplicate record IDs and ambiguous pair keys. Use a 10-second deadline and AbortSignal during loading and assembly, yielding between batches. Write a new output directory atomically outside Git checkouts; existing outputs fail rather than overwrite. Raw sources, answers, and reports stay under ignored `.software-journey/` or `.local/` locations.

No provider or subprocess access belongs in knowledge or the report command. Browser and server boundaries are unchanged. Offline reference review and synthetic fixtures establish harness behavior. Real human trials can be run locally with counterbalanced arm order and a declared repeat count. Future hosted trials require separate approval of exact selected snippets and provider budgets; no approval is inferred from this plan.

## Risks / Trade-offs

- Human review can be inconsistent → define required points and uncertainty criteria, retain reasons, and distinguish judgment from deterministic findings.
- A participant may learn answers between arms → document counterbalanced order and prior exposure; report those limitations with results.
- Existing captured evidence may not cover a historical change → require an explicit unavailable outcome and a documented collection gap.
- Supplied metrics and reviewer identities are self-reported → preserve provenance and avoid presenting them as independently audited.

## Migration Plan

Add contracts, local reporting, tests, and offline acceptance evidence. Existing snapshots, commands, lessons, and provider approval remain compatible. Rollback removes the additive command and types. Update the roadmap with a separate evaluation stretch, keeping R1–R7 completed and live-quality claims unestablished.
