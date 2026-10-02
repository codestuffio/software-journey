# Design

## Context

See [the proposal](proposal.md) for the observed benchmark gap. At revision `46abf54fda062ca5f38d62a2d4a6917f74f69263`, `packages/repository/src/index.ts` already reads bounded committed blobs for a pinned workflow catalog. `packages/knowledge/src/index.ts` retrieves documentation and workflow captures, and `packages/knowledge/src/answer-evaluation.ts` requires a complete matching capture for each expected citation. The workflow catalog supports one current revision; extending it for arbitrary historical source would mix collection with authored learning content.

## Goals / Non-Goals

The design adds one explicit Node collection operation and one optional artifact input to local consumers. It keeps snapshot schema version 1 and existing authored lessons intact. Browser projections and assisted explanations will not consume the new artifact in this slice. Capturing a file never approves a provider transfer.

## Decisions

### Preserve snapshots with a source sidecar

Add a `source-capture.json` artifact with schema version, content identity, snapshot identity, repository ID/commit, normalized selections, capture entries, omission/coverage totals, and run metadata. Each capture records its requested and actual inclusive range, committed blob ID, content digest, and exact decoded text. Identity covers semantic content and settings, excluding timestamps and absolute local paths. Consumers verify content digests and range/text consistency, as well as snapshot/repository binding; hashes detect inconsistency, not authorship or repository lineage.

An enriched snapshot would change every snapshot reader and invalidate matching workflow bundles. A separate artifact keeps existing evidence unchanged. Generic workflow bundles would require invented workflow IDs and would blur selected source with curated workflow steps.

### Select exact paths at committed HEAD

Propose `capture-sources --repository PATH --snapshot FILE --request FILE --output DIRECTORY`. The request has `schemaVersion: 1` and one to 16 exact relative paths with inclusive line ranges. Reject absolute paths, traversal, control characters, backslashes, glob syntax, duplicate selections, and invalid ranges. Sort accepted selections by path/start/end for reproducibility. Require the supplied snapshot and checkout HEAD/tree-derived repository identity to match before capture; resolve a fixed commit once and read that commit even if HEAD moves during the operation.

Reuse the hardened Git subprocess boundary in `packages/repository` and resolve tree entries to blob IDs before `cat-file blob`. Do not read working files, run a checkout, textconv, filters, hooks, tests, package scripts, or network fetches. Existing credential-like and generated/vendor exclusions remain mandatory. Symlinks, submodules, invalid UTF-8, NUL-containing blobs, absent paths, and missing objects produce per-selection unavailable entries. Dirty working files never replace committed content. Selections omitted from the snapshot inventory due to a collection limit can be resolved against the pinned tree, with that original inventory limitation retained.

### Bound collection and preserve complete lines

Proposed fixed limits are a 16 KiB regular request file, a 32 MiB snapshot, 16 selections, 256 KiB read per unique blob, 1 MiB combined blob reads, 128 KiB returned text per selection, 512 KiB combined returned text, a 2 MiB serialized artifact, and a 30-second overall deadline. Limits are checked during reads as well as at validation. The request cannot increase them. Read oversized blobs as unavailable instead of scanning arbitrarily large files to reach a late range.

UTF-8 decoding is strict. Preserve original line endings and match the existing citation line-count convention, including a final unterminated line. Clip out-of-file ranges to their actual intersection, report missing ranges, and trim text only at complete line boundaries. A line that exceeds a text budget is omitted with a reason. Read-budget exhaustion makes remaining selections unavailable in stable order; text-budget exhaustion makes overlapping captures partial or unavailable. Coverage records requested/captured/unavailable selections and bytes read/returned. Repeated selections of one blob count its read once but account separately for every returned excerpt.

Use an operation AbortSignal across all subprocesses, decode/selection checkpoints, validation, and writing. On timeout/cancel, terminate children and discard staging output. Publish once into a new output directory outside any Git checkout, resolving existing parent symlinks and applying the established report-output boundary. Do not overwrite existing artifacts or mutate the input snapshot.

### Consume artifacts through the existing local boundary

Extend `EvidenceInputs` with optional `sources`, and `context`/`retrieve` with optional `--sources FILE`. Reuse source/path selectors and byte-budget serialization. Add `selected-source` origin and source-capture identity to response contracts when present, with selection coverage and omission reasons. Old invocations remain valid and preserve their response bytes. A sidecar is optional and limited to 2 MiB; malformed, digest-mismatched, or incorrectly bound input fails before discovery/retrieval. Matching captures from different origins remain separate; never merge ranges to imply one complete capture.

Add evidence-manifest schema version 2 for `compare-answers`, with optional source artifact path/identity per revision; continue accepting version 1 unchanged. Charge sidecars against the existing 128 MiB combined artifact limit. Include supplied source identities in report provenance. Citation checks use the existing retrieval path and require complete requested ranges. Missing sidecars leave the historical case unavailable. Reporting remains artifact-only with its existing 10-second deadline, bounds, human review bindings, pairing rules, and metric provenance.

## Risks / Trade-offs

- Sensitive source can exist outside excluded names. Capture is an explicit local operation; document that path exclusions are not secret detection, and keep artifacts in ignored or external storage.
- A sidecar adds another input to bind correctly. Validate snapshot, revision, digest, and ranges before consumers expose text; reject mismatches rather than substituting checkout reads.
- Bounded full-blob reads omit useful ranges in large files. Disclose the limitation; do not add streaming whole-file indexing without separate measurement and approval.
- Historical objects may be absent. Keep unavailable entries and do not fetch automatically. The known pinned demonstration needs a local full checkout, with imported tests never executed.
- Full historical capture does not prove a behavior change. Acceptance checks text/citations; the reference answer and semantic inference still require human review.

## Migration Plan

Implement only after explicit approval. Keep existing snapshot, workflow, and evidence-manifest version 1 inputs supported. Add schema/IO tests first, then collection and local consumers, then the historical acceptance procedure. Document the new commands and revised availability only after acceptance succeeds. No deployment is needed for this local CLI slice. Rollback consists of omitting sidecars and using existing commands; never rewrite stored artifacts or describe the proposal as delivered behavior.
