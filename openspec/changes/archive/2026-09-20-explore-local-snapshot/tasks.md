## 1. Snapshot projection and deterministic demo evidence

- [x] 1.1 Define a browser-safe explorer projection and a compact schema-valid synthetic snapshot fixture; verify invalid, oversized, and projected-truncation inputs are rejected or labeled by focused contract tests.
- [x] 1.2 Add the narrow local snapshot loading boundary and verify it reads no checkout path, launches no process, performs no remote request, and returns only validated projection fields.

## 2. Evidence journey interface

- [x] 2.1 Replace the landing focus with a trailhead overview that presents local-session status, repository revision, timestamps, coverage, omissions, and incomplete history before navigation; verify all values are visibly labeled as recorded evidence.
- [x] 2.2 Build the field-notes list and accessible path filter; verify selecting a recorded extract, a no-match filter, an empty snapshot, and a no-selection state each have distinct, useful UI states.
- [x] 2.3 Build the evidence-lantern detail view with escaped captured text and immutable revision/path/line citation; verify missing line ranges and hostile-looking source text remain display-only.
- [x] 2.4 Apply the field-guide visual system to explorer surfaces with responsive, keyboard, focus, live-status, and reduced-motion behavior; verify desktop and narrow viewport usability with Playwright.

## 3. Evidence and release readiness

- [x] 3.1 Update local demo instructions and the roadmap status; verify the OpenSpec POC can be inspected through the local explorer without adding its raw snapshot to Git.
- [x] 3.2 Add focused unit and browser coverage for valid, malformed, coverage-limited, filtered, and citation-detail journeys; verify `pnpm verify` and `pnpm test:e2e` pass.
- [x] 3.3 Record acceptance evidence, reconcile delivered capability specs, and archive the change only after all preceding tasks are complete.
