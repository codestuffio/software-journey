# Tasks

## 1. Contracts and artifact loading

- [x] 1.1 Define version-1 discovery, selector, response, availability, and budget schemas in contracts; verify valid fixtures and rejection of contradictory selectors, unsupported versions, invalid ranges, and out-of-bounds budgets.
- [x] 1.2 Add bounded local artifact/request loading in the repository package with regular-file checks and cancellation; verify malformed, oversized, growing, missing, and non-regular inputs fail without evidence output.
- [x] 1.3 Validate bundle/snapshot content identity, repository/revision consistency, nested source references, unique step IDs, and line/text consistency; verify mismatch fixtures fail while existing valid artifacts remain supported.

## 2. Deterministic retrieval

- [x] 2.1 Activate the private knowledge workspace package using existing build conventions and contracts as its runtime dependency; verify package build/typecheck and consumption by the CLI without filesystem, Git, or provider imports in knowledge.
- [x] 2.2 Implement ordered discovery descriptors, coverage counts, and offset pagination; verify empty evidence, optional bundles, stable continuation, and byte-limited pages without source bodies.
- [x] 2.3 Implement exact path, workflow-step, and source-reference selection; verify overlapping captures retain provenance, history has a commit identity, wrong revisions fail, and uncaptured or unknown evidence returns specific unavailable reasons.
- [x] 2.4 Implement line-range intersections and collection coverage propagation; verify exact returned text/citations, missing ranges, unknown line origins, partial boundary lines, CRLF handling, and bounded omission detail.
- [x] 2.5 Implement complete-response UTF-8 byte budgeting and stable serialization; verify metadata and trailing newline count toward the limit, Unicode/JSON escaping, large indivisible records, oversized lines, adjusted citations, deterministic bytes, and metadata-too-large errors.
- [x] 2.6 Wire the 10-second deadline and cancellation through loading and selection with periodic yielding; verify cancellation before publication produces no success response and does not mutate input files.

## 3. CLI integration

- [x] 3.1 Add context and retrieve dispatch, help, validated argument parsing, JSON-only stdout, and stderr diagnostics; verify compiled CLI success, partial/unavailable responses, missing values, duplicate/unknown flags, invalid requests, and nonzero error exits while existing commands retain their behavior.
- [x] 3.2 Add integration coverage proving artifact-only operation with no usable checkout, Git invocation, network access, or execution of hostile source text; verify stdout responses conform to the contracts and selected byte budgets.

## 4. Acceptance and documentation

- [x] 4.1 Add a reproducible retrieval acceptance exercise for the five pinned OpenSpec catalog categories; compare actual retrieved source text/history and identity against the input artifacts, include reduced-budget and missing-evidence trials, and record response bytes and elapsed time in an ignored local report.
- [x] 4.2 Document commands, limits, exact request examples, exit semantics, evidence limitations, and observed acceptance outcomes in README, architecture, knowledge package documentation, and docs/acceptance; verify examples against the built CLI and keep imported source and generated reports out of Git.
- [x] 4.3 Run pnpm verify and strict OpenSpec validation, review the pinned acceptance results, and update R5's roadmap status only when acceptance is satisfied; keep R6 planned as a separate authored lesson and make no unmeasured answer-quality or savings claim.
