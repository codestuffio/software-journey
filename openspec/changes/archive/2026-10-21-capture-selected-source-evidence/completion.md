# Delivery evidence

The owner confirmed approval on 2026-10-03 and authorized continuation on 2026-10-05. The original proposal preserves the planning-time approval gate; it is historical context. All fourteen tasks are complete and the three delta specifications are synced to delivered specs.

Implementation landed through [PR #19](https://github.com/codestuffio/software-journey/pull/19), [PR #20](https://github.com/codestuffio/software-journey/pull/20), and [PR #23](https://github.com/codestuffio/software-journey/pull/23). The final merge is `495f5d25654e4fe54c4af74d68877213fe659ad6`; its [main verification](https://github.com/codestuffio/software-journey/actions/runs/39440771138) passed.

Evidence paths below refer to that merge revision:

| Tasks | Implementation and validation evidence |
| --- | --- |
| 1.1 | `packages/contracts/src/source-capture.ts`; `tests/source-capture-contracts.test.ts` covers selectors, integrity, spans, binding, limits, and cancellation. |
| 1.2 | `packages/contracts/src/index.ts`; `tests/source-capture-compatibility.test.ts` covers optional identities, v1/v2 manifests, and legacy response bytes. |
| 2.1–2.3 | `packages/repository/src/source-capture.ts` and `git.ts`; `tests/source-capture-collector.test.ts` covers pinned committed reads, dirty content, missing promisor objects without fetching, exclusions, modes, UTF-8, line boundaries, and byte budgets. |
| 2.4 | `tests/source-capture-publication.test.ts` covers exclusive atomic publication, checkout/symlink rejection, cancellation, deadlines, and process termination. |
| 2.5 | `apps/cli/src/capture-sources.ts`; `tests/source-capture-cli.test.ts` covers compiled collection, flags, bounded inputs, identity errors, and deadlines. |
| 3.1 | `packages/repository/src/artifacts.ts`; `tests/artifacts.test.ts` and `tests/source-capture-retrieval.test.ts` cover loading, provenance, missing ranges, budgets, and cancellation. |
| 3.2 | `apps/cli/src/evidence.ts`; `tests/source-capture-cli.test.ts` and `tests/evidence-cli.test.ts` cover artifact-only commands after removing the checkout, invalid sidecars, and blocked process/network access. |
| 3.3–3.4 | `packages/repository/src/answer-evaluation.ts` and `packages/knowledge/src/answer-evaluation.ts`; answer-evaluation tests cover v2 provenance, complete/missing historical ranges, input limits, review/quality/pairing gates, and unknown metrics. |
| 4.1 | [Pinned acceptance](../../../../docs/acceptance/answer-evaluation.md) records all three historical ranges, 5/5 available cases with sidecars versus 4/5 without, and removal of imported worktrees before reporting. |
| 4.2 | `tests/acceptance/prepare-answer-trials.mjs`, `docs/answer-evaluation.md`, and `docs/evaluation-pilot.md`; helper coverage in `tests/answer-evaluation-io.test.ts` preserves legacy v1 calls and validates optional v2 sidecars. |
| 4.3 | The 2026-10-18 local verification passed 168 Vitest tests, two compiled CLI/HTTP smoke checks, builds, types, lint, and 11 strict OpenSpec items. Focused source/answer checks passed 108 tests. These are historical implementation results; closure validation is recorded in its PR. |

The pinned acceptance verifies citation availability only. No human/model trials or semantic-quality, token/cost savings, or repository-lineage claims follow from it. Imported source and private artifacts remain local. Source collection grants no hosted-transfer approval. Release and distribution remain separate.
