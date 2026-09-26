# Design

## Context

See `proposal.md` for motivation. At project revision `4e3023a`, `packages/contracts/src/index.ts` defines version-1 snapshots, documentation extracts, workflow bundles, and source references. Inventory records have paths and object IDs but no source text. Workflow steps hold source text, commit metadata, or an unavailable reason. `packages/knowledge/README.md` reserves retrieval ownership but the directory is not yet a runnable package.

The CLI currently dispatches analyze, trace, and evaluate through `packages/repository`. Its evaluation catalog names five expected evidence categories; the evaluator checks citation metadata and does not grade answers or compare source text to Git. This change tests actual retrieval results independently without expanding that evaluator's claims.

## Goals / Non-Goals

Provide deterministic selection over validated artifacts, reusable without filesystem access. Keep snapshot and workflow schemas compatible. Source identity is recorded provenance, not proof that a user-supplied artifact is authentic.

This design adds no checkout reads during retrieval, persistence layer, provider calls, browser interface, or generated interpretation. It does not merge different revisions or reconstruct missing source.

## Decisions

### Separate artifact loading from selection

`packages/repository` owns bounded reading of explicitly supplied artifact and request files. Open each file once, require a regular file, and stop reading at its limit even if it grows after opening. Snapshot and optional bundle each have a 32 MiB input limit; request JSON has a 16 KiB limit. Validate schemas, nested source identities, and bundle snapshot identity, including snapshot content identity, before selection. Reject duplicate workflow step IDs and inconsistent source line/text lengths. Do not interpret recorded paths as filesystem paths.

Activate the private `@software-journey/knowledge` package with the existing TypeScript/build conventions and a contracts-only runtime dependency. It accepts validated data and a request, and returns a validated response without filesystem, process, or network access. `apps/cli` composes loading and selection. This is preferable to putting retrieval in the CLI because guided learning can later reuse the same logic. Existing repository operations need no refactor.

### Use explicit selectors and a discovery manifest

Add `software-journey context --snapshot <file> [--bundle <file>] [--max-bytes <n>] [--offset <n>]` and `software-journey retrieve --snapshot <file> [--bundle <file>] --request <file>`.

The request is a version-1 JSON object with `maxBytes` and exactly one selector:

- `path`: an exact, case-sensitive recorded repository path, optionally with inclusive `start` and `end` lines.
- `step`: a workflow ID and step ID, optionally with lines for a source step. History steps return recorded commit metadata and reject line selection.
- `source`: repository ID, commit SHA, exact path, and optional inclusive lines.

Discovery lists documentation and workflow evidence descriptors, their selectors, source references or history commit IDs, and availability. It includes counts for inventory, extracts, workflow steps, and history; it does not list every inventory file or include source bodies. Preserve workflow labels as product-authored metadata. Do not infer semantic areas from folder names. Paginate descriptors in a stable order using a nonnegative offset and return the next offset when the budget permits only part of the list. Include input content identities on every page so callers can detect changed inputs.

Path requests can match multiple captures. Return each separately in stable origin/ID order, retaining provenance rather than silently deduplicating or choosing a preferred capture. Step requests identify one step. A source selector must match the active repository and revision; a mismatch is an input error. Unknown paths, uncaptured inventory entries, and missing steps produce distinct unavailable reasons.

### Preserve line meaning and coverage

Slice only captured text. For a ranged request, intersect requested lines with recorded lines and cite the actual returned range. Label incomplete intersections as partial and record missing ranges. A capture with no recorded line range can be returned whole with a null range, but cannot answer a ranged request. Preserve original line separators and text; never normalize source text to make a range fit.

Collection omissions and response omissions are separate. Responses carry coverage counts, history completeness, relevant omission details, and total omission counts. Bound omission details too, with explicit counts for those not included. A partial final source line from collection must not be represented as complete; if existing artifact metadata cannot establish complete lines, omit that boundary line from ranged results and disclose the limitation. Whole-capture retrieval can retain the captured text with its collection warning.

History is typed commit metadata, not a fabricated file citation. The fifth baseline case asks for the pinned revision only; it does not establish a historical behavior change.

### Budget the serialized response

Version-1 responses include input identities, selector or discovery position, result status, items, coverage, and budget accounting. Valid budgets are 4,096 through 262,144 bytes, with a default of 32,768 bytes. Count UTF-8 bytes of the complete compact JSON response plus its trailing newline, including metadata and escaped source text. Byte counts are not token estimates.

Add items in deterministic order. For source bodies, include only the longest prefix of complete captured lines that fits, and adjust the returned citation. Never split UTF-8 characters or emit a shortened line as a complete source line. If no complete line fits, return no text with a budget reason. History records and manifest descriptors are indivisible. Include omitted item/line counts where known. If required envelope metadata alone cannot fit, fail with a short `budget-too-small` error instead of exceeding the budget or losing provenance.

Use `available`, `partial`, and `unavailable` for retrieval outcomes. Missing evidence is a valid response; malformed input is an error. Stable ordering and exclusion of timestamps/latency from response content make identical inputs and requests produce identical bytes. Runtime measurement belongs in the acceptance harness.

### Keep CLI output and local boundaries explicit

Write one complete validated JSON response to stdout after collection, validation, and selection finish. Diagnostics go to stderr. Invalid flags, malformed or oversized files, mismatched identities, unsupported versions, and impossible budgets exit nonzero with no JSON success response. Missing evidence and bounded partial evidence exit zero with the corresponding status. Reject unknown or duplicate flags, contradictory selectors, and invalid numeric ranges for the new commands without changing existing command behavior.

No output-directory or repository argument is required. Users may redirect stdout locally. Retrieval performs no network call, Git invocation, code execution, or provider selection. Imported text is inert data. Hosted transfer would need a separate consent specification. The browser/server boundary is unchanged.

Use an AbortSignal and a 10-second operation deadline. Check cancellation during bounded reads and between selection batches, yielding to the event loop for large inputs. Buffer output until completion so pre-publication failure/cancellation emits no successful response. A broken stdout pipe can still interrupt delivery; handle it as a process failure, not an atomic-file guarantee.

### Evaluate retrieval directly

Add focused synthetic fixtures proving exact text/range selection, deterministic output, null and partial ranges, Unicode/JSON escaping, indivisible oversized lines, missing evidence, identity mismatches, and input/output limits. CLI tests must prove that retrieval works with an unavailable checkout and makes no Git or network request.

For the pinned OpenSpec POC, retrieve the five catalog categories from the existing snapshot and bundle. Compare each result's identity and exact captured text or history record with the input artifact, and verify every serialized response fits its budget. Record response bytes and elapsed time in an ignored local acceptance report and summarize outcomes in `docs/acceptance`. Include a reduced-budget trial and an unavailable-evidence trial. Do not treat the existing evaluator's five passes as proof of retrieval correctness or semantic answer quality.

## Risks / Trade-offs

- Artifact-only retrieval cannot return arbitrary code. Report `not-captured` and leave additional collection to a later change.
- A line can exceed the response budget. Omit it with a budget reason; callers can increase the budget within the published maximum.
- Captures may overlap or be incomplete. Keep origins distinct and expose missing ranges and collection warnings.
- A 32 MiB artifact cap can reject larger existing artifacts. Give a specific size-limit error; widening limits requires representative measurements.
- Byte-efficient output may not improve an agent's answers. Make no quality or cost claim until a separate controlled evaluation measures it.

## Migration Plan

Add contracts, activate the knowledge package, add the local loading boundary and CLI commands, then run focused tests and the pinned acceptance exercise. Update documentation and R5 only after acceptance. No stored-data migration is required. Rollback removes the additive commands and package without changing existing snapshots, workflows, or evaluation reports. R6 remains a separate proposal after R5 acceptance, scoped first to one authored, source-cited lesson.
