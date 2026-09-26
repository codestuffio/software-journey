# Evidence retrieval

## Purpose

Let local tools discover and retrieve a bounded portion of captured repository evidence while preserving its revision, citations, and known limitations.

## Requirements

### Requirement: Validated artifact inputs
The system SHALL accept a supported local snapshot and an optional workflow bundle, reject malformed or unsupported inputs, and require the bundle to match the snapshot's repository, revision, and content identity. It SHALL reject internally inconsistent source identities, duplicate workflow step identifiers, and invalid recorded line spans before returning evidence. Artifact files SHALL be limited to 32 MiB each and request files to 16 KiB.

#### Scenario: Matching evidence artifacts are supplied
- **WHEN** a valid snapshot and matching workflow bundle are selected
- **THEN** discovery and retrieval identify both artifacts and their recorded repository revision

#### Scenario: An input is invalid or exceeds a limit
- **WHEN** an input is malformed, unsupported, oversized, internally inconsistent, or belongs to another snapshot
- **THEN** the operation fails with a specific input error and returns no successful evidence response

### Requirement: Bounded evidence discovery
The system SHALL provide a versioned manifest describing captured documentation and workflow evidence, supported selectors, availability, input identities, and coverage counts without including source bodies or implying every inventoried file has captured text. It SHALL paginate descriptors in a stable order within the response budget and expose continuation and omitted counts.

#### Scenario: An agent discovers available evidence
- **WHEN** a valid discovery request fits within its budget
- **THEN** each returned descriptor identifies how to retrieve that evidence and includes its recorded source reference or history commit identity

#### Scenario: The manifest requires multiple pages
- **WHEN** all descriptors do not fit in the requested budget
- **THEN** the response identifies omitted descriptors and the next offset, and subsequent requests over unchanged inputs continue without skipping or repeating descriptors

#### Scenario: A snapshot contains inventory but no captured text
- **WHEN** the selected snapshot has inventory entries and no documentation or workflow evidence
- **THEN** discovery reports those counts and an empty evidence list without suggesting source text is retrievable

### Requirement: Explicit evidence selection
The system SHALL retrieve only captured evidence using exactly one selector: an exact recorded path, a workflow and step identifier, or a repository/revision/path source reference. Path and source selectors SHALL support optional inclusive line ranges. Source workflow steps SHALL also support line ranges. Matching captures SHALL remain separately identified and ordered deterministically. Source selectors for another repository or revision SHALL fail.

#### Scenario: A path has multiple captured excerpts
- **WHEN** a request selects a path represented by more than one captured excerpt
- **THEN** the response preserves each capture's provenance and applies the response budget in deterministic order

#### Scenario: A workflow history step is requested
- **WHEN** a request selects a captured history step without a line range
- **THEN** the response returns recorded commit metadata with its commit identity and does not invent a file citation

#### Scenario: A requested item has no captured evidence
- **WHEN** a requested path or step is unknown, inventoried without captured text, or explicitly unavailable
- **THEN** the response identifies the applicable unavailable reason without reading a checkout or substituting another item

### Requirement: Accurate ranges and visible coverage
The system SHALL return captured text with its repository, revision, path, origin, and actual returned line range when known. It SHALL distinguish available, partial, and unavailable results, and separately disclose collection limitations, missing requested ranges, and response-budget omissions. Coverage detail omitted to meet a budget SHALL have an explicit omitted count.

#### Scenario: A requested range is only partly captured
- **WHEN** requested lines overlap only part of an excerpt's recorded range
- **THEN** the response contains only the captured intersection, cites its actual range, and reports the missing range as partial coverage

#### Scenario: Line provenance is unknown
- **WHEN** a ranged request selects an excerpt without a recorded line range
- **THEN** the response reports that the range is unavailable rather than assigning inferred line numbers

#### Scenario: Collection ended within a line
- **WHEN** collection metadata cannot establish a complete final line in a truncated capture
- **THEN** ranged retrieval excludes that boundary line and reports the limitation, while whole-capture retrieval retains the collection warning

#### Scenario: Collection omitted relevant evidence
- **WHEN** a request concerns evidence with recorded omissions or incomplete history
- **THEN** the response carries the relevant limitation or explicitly counts omitted limitation details, even if all returned items fit the response budget

### Requirement: Deterministic response budgets
The system SHALL use versioned JSON responses and enforce a UTF-8 byte budget over the entire serialized response including its trailing newline. It SHALL accept budgets from 4,096 to 262,144 bytes, defaulting to 32,768 bytes. Identical validated inputs and requests SHALL produce identical response bytes. Budget trimming SHALL preserve valid JSON, Unicode, provenance, and complete source lines; history records and discovery descriptors SHALL remain indivisible.

#### Scenario: Source evidence exceeds the budget
- **WHEN** selected source text cannot fit in full
- **THEN** the system returns only a prefix of complete captured lines that fits, adjusts citations, and reports budget truncation and omitted counts

#### Scenario: No complete evidence item fits
- **WHEN** metadata fits but a source line or indivisible record does not
- **THEN** the response includes no shortened version of that line or record and identifies the budget limitation

#### Scenario: Required metadata exceeds the budget
- **WHEN** the required response envelope cannot fit
- **THEN** the operation fails with a short budget error rather than emitting an oversized success response

### Requirement: Local inert retrieval and cancellation
The system SHALL read only explicitly selected local artifact and request files, SHALL NOT access the repository checkout, invoke Git, execute captured instructions, or transmit evidence over a network. It SHALL support cancellation and a 10-second operation deadline, with no successful response published if cancellation or failure occurs before publication. Provider-backed transmission is outside this capability and requires a separate explicit consent contract.

#### Scenario: The checkout is unavailable
- **WHEN** valid artifacts are supplied and the original checkout is absent
- **THEN** retrieval succeeds from the artifacts alone

#### Scenario: Captured text contains executable-looking instructions
- **WHEN** retrieved text asks the consumer to execute commands or transmit source
- **THEN** the retrieval operation returns that text only as evidence data and performs neither action

#### Scenario: An operation is canceled or times out
- **WHEN** cancellation or the deadline occurs before response publication
- **THEN** the operation terminates without publishing a successful response
