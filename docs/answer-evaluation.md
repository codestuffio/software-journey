# Compare repository answers locally

`compare-answers` assembles recorded answers, human reviews, and resource measurements into a local JSON report. It makes no model request, runs no Git command, and does not execute imported text. The existing `evaluate` command still checks only citation availability.

Start with [the first-pilot walkthrough](evaluation-pilot.md) for reference review, a practice session, participant trials, and the separate AI evaluation stage. This document provides the detailed artifact and command instructions.

## Prepare the reference set

The authored rubric is exported as `openSpecAnswerBenchmark` from the repository package. It contains five questions, required answer points, uncertainty criteria, and exact source references. It contains no upstream excerpts or reference-answer bodies.

The four current questions use OpenSpec revision `bae58cf61479986431bb798acbe5a688a591c18c`. Their references are:

| Question | Captured reference | What a reviewer checks |
| --- | --- | --- |
| Entry point | `src/cli/index.ts:730-748` | Connect command registration to its handler |
| Execution path | `src/commands/workflow/new-change.ts:116-158,167-179` | Explain validation, root/schema selection, creation call, and output without inventing callee behavior |
| Governing spec | `openspec/specs/change-creation/spec.md:6-23` | Identify creation and rejection requirements, distinguishing requirements from observed behavior |
| Validating test | `test/cli-e2e/basic.test.ts:75-103` | Explain help/version assertions without claiming they test new-change correctness or were executed |

The fifth question concerns task marker handling. Before revision `62106f40e3b7b7364529a2f928717e23e37282eb`, the strict pattern at `src/utils/task-progress.ts:26-51` omitted unfamiliar markers. At `11a9691524bad84a575854bf6dc5124f630479ba`, `src/utils/task-progress.ts:55-80` accepts additional checkbox shapes and treats only a padded, case-insensitive `x` as done. The regression assertions at `test/utils/task-progress.test.ts:359-382` preserve the unfinished denominator, including the 42-done/17-deferred case. These source references were inspected as committed text; imported tests were not run.

Snapshots from both historical revisions were collected, but their parser/test code is inventoried without captured text. The workflow trace catalog supports only the pinned current revision. The historical case therefore reports unavailable until a separate collection change supplies the missing code. Commit subjects cannot substitute for that evidence.

Repository IDs currently hash the revision and tree. They differ across these three revisions. `revisionIdentities` records each exact ID/SHA pair; it does not prove repository lineage. Prepare the historical snapshots from isolated local checkouts with committed HEAD at the listed revisions. Keep hooks, filters, and imported scripts disabled. Never change the user's original checkout for an evaluation.

After building, create local templates from the existing artifacts:

```sh
node tests/acceptance/prepare-answer-trials.mjs \
  --snapshot .software-journey/poc/openspec/snapshot.json \
  --bundle .software-journey/poc/openspec/workflow/workflow.json \
  --before .software-journey/answer-evaluation/before/snapshot.json \
  --after .software-journey/answer-evaluation/after/snapshot.json \
  --output .software-journey/answer-evaluation/trial-inputs
```

The output directory must be new. It contains benchmark and evidence files, empty trial and assessment lists, and a separate editable trial template. The template starts as synthetic, has no measurements or citations, and is never automatically included in `trials.json`.

Before inviting participants, a human reviewer should draft and review a reference answer for each available question against the captured evidence. Record required points, acceptable alternatives, and unsupported claims. Save answer bodies and source extracts locally under ignored directories. If the rubric changes, increment its version and regenerate its digest; all old trial/review bindings become stale. Unavailable questions remain in the report and cannot pass quality comparison.

## Run comparable human trials

1. Choose a participant configuration, question set, equal context/output/time budgets, and repeat count before starting. Record participant experience and prior exposure to the answers. Use a consistent token counter if a token budget is enforced; otherwise retain the declared output cap and disclose that enforcement was unmeasured.
2. Use separate sessions for direct exploration and retrieval. Counterbalance the order across participants or repetitions to reduce learning effects. Record arm order and prior exposure in each trial's `protocolNotes`; it remains a limitation even with counterbalancing.
3. In the direct arm, allow local committed file/search inspection at the specified revision. In the retrieval arm, use `context` and `retrieve` against the matching captured artifacts. Do not quietly fill a retrieval gap from the checkout. Use identical questions and declared budgets in both arms.
4. Save the participant's exact answer and citations in a trial record. Copy the template into `trials.json` only after filling it. Use one direct and one retrieval record per pairing key; change `provenance` to `real` only for an actual participant run. Identical question, repetition, participant/model configuration, revisions, benchmark digest, and budgets are required for pairing.
5. Measure elapsed time with a monotonic clock from question presentation through final answer. Count actual tool calls. Count UTF-8 bytes in tool responses or total input, declaring the exact scope and recording how each value was obtained. Use the same scope in both arms. Token counts and account costs stay null unless actually measured with recorded provenance. Provider estimates are not account charges.

Use at least three repetitions for a pilot and report every attempted trial, including failures and missing pairs. A small pilot cannot establish general savings. The reporter preserves supplied measurements; it does not independently monitor participants or enforce their declared budgets.

## Review answers and produce reports

The wrapper shapes are `{ "schemaVersion": 1, "trials": [...] }` and `{ "schemaVersion": 1, "assessments": [...] }`. Shared runtime schemas document all required fields. Each metric is null or `{ "value": 123, "scope": "tool-response", "provenance": "How this was measured" }`. Missing values are null, never zero placeholders.

First run with an empty assessments list to produce unreviewed trial records and their exact `answerDigest` values:

```sh
node apps/cli/dist/index.js compare-answers \
  --benchmark .software-journey/answer-evaluation/trial-inputs/benchmark.json \
  --trials .software-journey/answer-evaluation/trial-inputs/trials.json \
  --assessments .software-journey/answer-evaluation/trial-inputs/assessments.json \
  --evidence .software-journey/answer-evaluation/trial-inputs/evidence.json \
  --output /Users/you/.software-journey/answer-reports/unreviewed-1
```

A human reviewer then records one assessment per answer. Include `trialId`, `reviewerId`, the report's `benchmarkDigest`, the trial's `answerDigest`, and the benchmark's `rubricVersion`. Each of `correctness`, `citationSupport`, and `uncertainty` is an object with `outcome: "pass"` or `"fail"` and a concrete `reason`. Review against every required point and acceptable uncertainty. A citation that resolves does not automatically make an answer true. Blind the reviewer to arm and resource metrics where practical and retain disagreements or protocol limitations in local review notes.

Run the same command with completed assessments and a new output directory. Changes to an answer, its citations, or the rubric invalidate the old review. Unknown trial IDs, stale bindings, and ambiguous pairs fail rather than being silently discarded.

`comparison.json` preserves the rubric, input identities, exact trial records, reviewers/reasons, citation findings, pair eligibility, and sample counts. Differences are retrieval minus direct. A cheaper incorrect answer retains its measured differences and is excluded from successful comparisons. Synthetic, unreviewed, unavailable, or unmatched trials cannot establish quality-preserving savings. Negative byte differences do not establish token or cost savings. There is no aggregate universal savings claim.

## Bounds and privacy

Inputs are explicitly selected regular JSON files, limited to 1 MiB each. An evidence manifest names snapshot and optional bundle paths, resolved relative to that manifest, plus expected content identities. Evidence artifacts are limited to 32 MiB each and 128 MiB combined. The benchmark permits 20 cases and trial lists permit 100 records. Reports are limited to 4 MiB. Processing has a 10-second deadline and supports Ctrl-C cancellation.

Output must be a new directory outside any Git checkout, including symlinked checkout paths. Reports are published atomically after validation. Failure or cancellation leaves no completed partial report. Empty trial sets are allowed for offline reference preparation; they establish no answer quality.

All answers, raw evidence, and reports stay local. Hosted trials are separate work and require approval of the exact selected snippets and provider budget before transmission. This command never dispatches them.
