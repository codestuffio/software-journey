## 1. Contract and fixtures

- [x] 1.1 Resolve the runtime validator, resource limits, exclusions, filename encoding, and committed-HEAD policy; verify the design, specs, and decision record contain no implementation-blocking ambiguity.
- [x] 1.2 Define versioned snapshot contracts for observed facts, quoted documentation, coverage, omissions, and run metadata; verify invalid persisted data is rejected at the write boundary.
- [x] 1.3 Create synthetic Git fixtures for valid, empty, dirty, shallow, binary, symlink, submodule, large-text, unusual-path, excluded-path, and multi-commit repositories; verify each fixture is isolated and reproducible.

## 2. Read-only analysis

- [x] 2.1 Implement repository and revision validation plus bounded tracked-file inventory; verify invalid paths, no-commit repositories, dirty files, option-like paths, and limits produce the specified outcomes.
- [x] 2.2 Implement documentation extraction with exclusions and per-file and total byte limits; verify every extract carries a resolvable committed path and line range, and every skipped item has a reason.
- [x] 2.3 Implement bounded commit metadata and shallow-history reporting; verify missing history is labeled incomplete and analysis never fetches from a remote.
- [x] 2.4 Implement timeout, cancellation, and atomic snapshot output outside the target checkout; verify canceled and failed runs expose no completed partial snapshot or target-repository modifications.

## 3. CLI and verification

- [x] 3.1 Add the analysis command and actionable error and coverage output; verify help describes only implemented behavior and unsupported commands fail clearly.
- [ ] 3.2 Add integration tests proving repository immutability, no script or hook execution, no network use, stable content identities, and expected omissions across synthetic fixtures.
- [x] 3.3 Analyze a local OpenSpec checkout at a recorded SHA; manually resolve sampled documentation and history citations and record the acceptance evidence.
- [ ] 3.4 Update contributor documentation, run `pnpm verify`, reconcile delivered capability specs, and archive only after all acceptance evidence is recorded.
