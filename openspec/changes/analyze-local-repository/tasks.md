## 1. Contract and fixtures
- [ ] 1.1 Review resource limits, exclusion defaults, filename encoding, and committed-HEAD behavior.
- [ ] 1.2 Define and validate the versioned snapshot format with provenance and coverage.
- [ ] 1.3 Create synthetic Git fixtures covering the scenarios in repository-analysis.

## 2. Read-only analysis
- [ ] 2.1 Implement repository/revision validation and bounded tracked-file inventory.
- [ ] 2.2 Implement documentation extraction with exclusions and byte limits.
- [ ] 2.3 Implement bounded commit metadata with shallow-history reporting.
- [ ] 2.4 Implement cancellation, timeout, and atomic snapshot output outside the target.

## 3. CLI and verification
- [ ] 3.1 Add the analysis command and actionable error/coverage output.
- [ ] 3.2 Prove repository immutability, no script execution, and deterministic content identities with integration tests.
- [ ] 3.3 Analyze a local OpenSpec checkout at a recorded SHA and manually resolve sampled citations.
- [ ] 3.4 Update contributor docs, run the full verification gate, and archive only after acceptance.
