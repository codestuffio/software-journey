# evidence-retrieval delta

## MODIFIED Requirements

### Requirement: Validated artifact inputs
The system SHALL accept a supported local snapshot and an optional workflow bundle, reject malformed or unsupported inputs, and require the bundle to match the snapshot's repository, revision, and content identity. It SHALL reject internally inconsistent source identities, duplicate workflow step identifiers, and invalid recorded line spans before returning evidence. Artifact files SHALL be limited to 32 MiB each and request files to 16 KiB.

The system SHALL also accept an optional source-capture artifact limited to 2 MiB, require its snapshot/repository/revision binding and digests to match, and validate capture ranges and text consistency. Legacy snapshot-only and snapshot/bundle inputs SHALL remain supported with unchanged responses when no source artifact is supplied.

#### Scenario: Matching evidence artifacts are supplied
- **WHEN** a valid snapshot and matching workflow bundle are selected
- **THEN** discovery and retrieval identify both artifacts and their recorded repository revision

#### Scenario: An input is invalid or exceeds a limit
- **WHEN** an input is malformed, unsupported, oversized, internally inconsistent, or belongs to another snapshot
- **THEN** the operation fails with a specific input error and returns no successful evidence response

#### Scenario: A source-capture artifact matches
- **WHEN** a valid matching source-capture artifact is selected with a snapshot
- **THEN** source/path retrieval includes its captures with their separate provenance and artifact identity without reading the checkout

#### Scenario: A source artifact is mismatched or inconsistent
- **WHEN** its digest, snapshot binding, revision, ranges, or text consistency is invalid
- **THEN** the operation rejects the input before exposing source text

### Requirement: Bounded evidence discovery
The system SHALL provide a versioned manifest describing captured documentation, workflow evidence, and optional selected source captures, supported selectors, availability, input identities, and coverage counts without including source bodies or implying every inventoried file has captured text. It SHALL paginate descriptors in a stable order within the response budget and expose continuation and omitted counts.

#### Scenario: An agent discovers available evidence
- **WHEN** a valid discovery request fits within its budget
- **THEN** each returned descriptor identifies how to retrieve that evidence and includes its recorded source reference or history commit identity

#### Scenario: The manifest requires multiple pages
- **WHEN** all descriptors do not fit in the requested budget
- **THEN** the response identifies omitted descriptors and the next offset, and subsequent requests over unchanged inputs continue without skipping or repeating descriptors

#### Scenario: A snapshot contains inventory but no captured text
- **WHEN** the selected snapshot has inventory entries and no documentation, workflow evidence, or selected source captures
- **THEN** discovery reports those counts and an empty evidence list without suggesting source text is retrievable

#### Scenario: Selected source coverage is discovered
- **WHEN** a matching source-capture artifact contains available, partial, or unavailable selections
- **THEN** discovery preserves each selection's origin and coverage, records the artifact identity, and does not imply that other inventoried code was captured
