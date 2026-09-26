## Purpose

Guide an onboarding reader through authored tutorial steps while preserving the boundary between repository evidence and explanation.

## ADDED Requirements

### Requirement: Curated revision-pinned tutorial
The system SHALL offer a tutorial only when a checked-in catalog entry matches the selected local workflow and repository revision. It SHALL present authored steps in order and SHALL NOT make a model call.

#### Scenario: Supported workflow is opened
- **WHEN** a matching snapshot and workflow bundle are selected
- **THEN** Learning shows the authored step sequence and its cited evidence

#### Scenario: Unsupported or mismatched revision is opened
- **WHEN** no catalog entry matches the repository, revision, workflow ID, and catalog version
- **THEN** Learning states that no authored tutorial is available without inventing a replacement

### Requirement: Epistemic status and provenance
The system SHALL distinguish facts, direct source quotations, authored inferences, and unknowns. Every factual claim SHALL identify source evidence at the selected repository revision and path, with a line range. Any future generated explanation SHALL be explicitly labeled as generated and SHALL NOT be presented as source fact.

#### Scenario: Reader examines a factual or inferred claim
- **WHEN** the reader opens its evidence
- **THEN** the UI shows the immutable revision, path, line range, and captured text alongside the claim's status

#### Scenario: Reader examines a quotation
- **WHEN** a quoted documentation claim is displayed
- **THEN** the quoted words come from the captured source excerpt and are labeled as recorded text

#### Scenario: Evidence is unavailable or truncated
- **WHEN** a citation cannot be checked against the selected bundle or its text was truncated
- **THEN** the UI acknowledges the gap and does not display the claim as fully evidenced

### Requirement: Baseline citation gate
The evidence evaluation baseline SHALL check that tutorial citations resolve to source evidence with the expected repository, revision, path, and line range. The validated bundle SHALL carry a source extract content ID. It SHALL report invalid citations. Semantic or generated-content quality scoring is deferred to R7.

#### Scenario: A tutorial citation is malformed or mismatched
- **WHEN** the baseline evaluates a missing, wrong-path, wrong-revision, or truncated cited extract
- **THEN** it reports that citation as invalid

#### Scenario: A tutorial citation resolves
- **WHEN** the referenced extract matches the pinned catalog and has a recorded line range
- **THEN** the citation passes the structural check without claiming semantic correctness
