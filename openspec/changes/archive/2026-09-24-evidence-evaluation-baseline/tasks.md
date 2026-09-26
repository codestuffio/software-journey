## 1. Evaluation contract and catalog

- [x] 1.1 Add versioned schemas for evaluation cases, citation expectations, and bounded local reports; verify contract tests accept valid reports and reject malformed or mismatched inputs.
- [x] 1.2 Add the pinned OpenSpec five-question catalog with expected source references and answer-shape metadata; verify a catalog test asserts every required question and citation.

## 2. Deterministic local evaluation

- [x] 2.1 Implement local snapshot and workflow-bundle evaluation with identity/revision validation and explicit unavailable results; verify success, mismatch, missing evidence, and truncation cases.
- [x] 2.2 Add atomic report writing and cancellation/output-boundary behavior; verify no partial report is exposed after failure or cancellation.
- [x] 2.3 Add CLI evaluation help and input validation; verify compiled CLI help, missing flags, unsupported commands, and a successful local run.

## 3. POC and verification

- [x] 3.1 Produce the ignored OpenSpec evaluation report and document the command, five expected cases, and observed outcomes in `docs/acceptance`; verify no third-party source or report is tracked.
- [x] 3.2 Update R4 status/link in `docs/roadmap.md`; verify R3 remains completed and archived.
- [x] 3.3 Run `pnpm verify`, `pnpm test:e2e`, and strict OpenSpec validation; record the passing checks in the acceptance document.
