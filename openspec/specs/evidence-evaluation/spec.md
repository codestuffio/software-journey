# Evidence evaluation

## Purpose

Provide a fixed, reproducible way to evaluate whether local repository evidence answers defined onboarding questions correctly.

## Requirements

### Requirement: Revision-pinned evaluation cases
The system SHALL provide a versioned local evaluation set for a supported repository revision. Each case SHALL state its question, expected source references, and the evidence category it evaluates.

#### Scenario: A supported evaluation set is selected
- **WHEN** a user evaluates a matching local snapshot
- **THEN** the system evaluates every fixed case against that snapshot's repository identity and commit

#### Scenario: The snapshot does not match
- **WHEN** a user evaluates a snapshot whose identity or commit differs from the evaluation set
- **THEN** the system rejects the run without reporting a passing result

### Requirement: Citation-validity report
The system SHALL write a local report that records each case's pass, fail, or unavailable outcome; expected and observed citations; and snapshot coverage or omissions relevant to the result.

#### Scenario: Expected evidence resolves
- **WHEN** a case's expected citation is present and matches the pinned revision
- **THEN** the report marks the case as passed with the resolvable citation

#### Scenario: Evidence is missing or truncated
- **WHEN** expected evidence is unavailable from the selected snapshot or workflow bundle
- **THEN** the report marks the case unavailable or failed and preserves the recorded coverage limitation

### Requirement: Local-only evaluation
The system SHALL evaluate local artifacts without executing repository code or transmitting source content, answers, or reports over a network.

#### Scenario: A user runs an evaluation
- **WHEN** a valid local evaluation is requested
- **THEN** the system produces its report locally and identifies it as deterministic evaluation rather than a model-generated answer
