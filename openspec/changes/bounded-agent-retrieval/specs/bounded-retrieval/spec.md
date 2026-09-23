## ADDED Requirements

### Requirement: Versioned, pinned retrieval request
The system SHALL accept a versioned request containing repository identity, commit, snapshot identity, optional area or exact path filters, and bounded result limits. It SHALL reject a request that does not match the selected snapshot.

#### Scenario: Matching local snapshot
- **WHEN** a request identifies the selected snapshot and a documentation path
- **THEN** the system returns only matching captured evidence with its revision and source path

#### Scenario: Mismatched revision
- **WHEN** the request identifies a different repository, commit, or snapshot content identity
- **THEN** retrieval fails without emitting a result manifest

### Requirement: Explicit bounded response
The system SHALL cap returned extracts, characters per extract, and reported omission records. It SHALL include cited line ranges, coverage counts, and explicit result and source omission counts.

#### Scenario: Matching evidence exceeds a limit
- **WHEN** matching evidence or text exceeds a request limit
- **THEN** the response reports returned and omitted counts, marks truncation, and cites only displayed lines

#### Scenario: Source is absent from snapshot extracts
- **WHEN** an inventory path has no captured text
- **THEN** the response reports it as unavailable rather than inventing source content

#### Scenario: Snapshot has omissions
- **WHEN** snapshot omissions match the requested area or path
- **THEN** the response reports their reasons up to the cap and counts any unreported omission records

### Requirement: Local evaluation and data boundary
The system SHALL expose retrieval from a local snapshot as JSON and allow the fixed evidence evaluation catalog to query the same retrieval contract. It SHALL not execute repository code or transmit source content automatically.

#### Scenario: Fixed evaluation cases are queried
- **WHEN** a pinned snapshot is evaluated
- **THEN** every case records availability, observed citation when available, and retrieval coverage and truncation metadata

#### Scenario: Unsupported catalog revision
- **WHEN** a snapshot does not match the pinned evaluation catalog
- **THEN** the CLI rejects the evaluation without a passing report
