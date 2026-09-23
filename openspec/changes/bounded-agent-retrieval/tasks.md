## 1. Contract

- [x] 1.1 Define strict versioned retrieval request, response, and evaluation schemas with repository, snapshot, filter, citation, limit, and coverage fields.
- [x] 1.2 Verify valid responses and reject mismatched identities and excessive limits with focused tests.

## 2. Local retrieval

- [x] 2.1 Implement snapshot-only area and path selection with hard evidence and omission caps.
- [x] 2.2 Expose `retrieve` JSON output and validate CLI inputs.
- [x] 2.3 Verify citations, missing extracts, omissions, and truncation against fixed fixtures.

## 3. Evaluation and verification

- [x] 3.1 Query retrieval with the R4 fixed cases and report per-case coverage and availability.
- [x] 3.2 Run `pnpm verify` and strict OpenSpec validation.
