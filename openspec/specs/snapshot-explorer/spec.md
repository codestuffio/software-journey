# Snapshot explorer

## Purpose

Let an engineer inspect the local evidence snapshot for a repository as a source-cited, coverage-aware journey rather than as raw JSON.

## Requirements

### Requirement: Local snapshot entry
The application SHALL let a user explicitly select a local snapshot file and SHALL display only data that conforms to the supported snapshot schema.

#### Scenario: A valid snapshot is selected
- **WHEN** a user selects a supported, valid local snapshot file
- **THEN** the application presents a repository journey for that snapshot without accessing the analyzed checkout

#### Scenario: A snapshot is malformed or unsupported
- **WHEN** a selected file cannot be parsed or fails the supported snapshot schema
- **THEN** the application keeps prior evidence unavailable, identifies the file as unusable, and gives a recovery action

### Requirement: Evidence-first journey overview
The application SHALL show the selected snapshot's repository identity, committed revision, collection timestamp, inventory/documentation/history coverage, and omissions or incomplete history before a reader navigates its contents.

#### Scenario: Coverage is complete enough for collection limits
- **WHEN** the snapshot records complete coverage for a category
- **THEN** the overview identifies the recorded quantity without implying claims beyond that category

#### Scenario: Evidence was omitted or truncated
- **WHEN** the snapshot records omissions, a limit, or incomplete history
- **THEN** the overview shows the affected scope and reason before a reader relies on the evidence

### Requirement: Documentation evidence navigation
The application SHALL let a reader browse recorded documentation extracts, filter them by recorded path, and inspect an extract with its immutable commit, path, line range, and captured text.

#### Scenario: A reader chooses an extract
- **WHEN** a reader selects a documentation result
- **THEN** the detail view shows only the captured text and its recorded source reference

#### Scenario: A filter matches no evidence
- **WHEN** a reader filters the documentation list and no recorded path matches
- **THEN** the application states that no recorded evidence matches and preserves the active filter for adjustment

#### Scenario: An extract has no line range
- **WHEN** the snapshot records a documentation extract without a line range
- **THEN** the detail view identifies the revision and path and states that no line range was recorded

### Requirement: Honest local data boundary
The application SHALL not read repository files, execute repository code, send snapshot contents over a network, or represent source facts as generated explanations while exploring a snapshot.

#### Scenario: A reader uses the explorer
- **WHEN** a valid snapshot is being explored
- **THEN** the interface identifies information as recorded evidence and offers no model-generated interpretation

#### Scenario: A source path is visible
- **WHEN** the interface displays a recorded source reference
- **THEN** it treats the path as display-only evidence and does not open or execute it from the browser

### Requirement: Local workflow trail entry and navigation
The application SHALL let a reader explicitly select a valid local workflow bundle and navigate its ordered evidence steps alongside the matching snapshot. It SHALL display each step's product-authored label, captured source reference, and recorded excerpt without accessing the repository from the browser.

#### Scenario: A matching bundle is selected
- **WHEN** a reader selects a valid workflow bundle that identifies the active snapshot's repository identity and commit
- **THEN** the application presents the ordered workflow trail and lets the reader inspect each captured evidence step

#### Scenario: A bundle does not match the active snapshot
- **WHEN** a reader selects a syntactically valid bundle whose repository identity or commit differs from the active snapshot
- **THEN** the application keeps the workflow trail unavailable and identifies the mismatch without replacing the active snapshot evidence

#### Scenario: A workflow step is incomplete
- **WHEN** a selected workflow bundle records unavailable or truncated evidence for a step
- **THEN** the application displays the recorded affected scope and reason before showing the available evidence

### Requirement: Workflow evidence provenance
The application SHALL display workflow source references as immutable recorded evidence and SHALL distinguish product-authored step labels from captured repository text and recorded history metadata.

#### Scenario: A reader inspects a workflow step
- **WHEN** a reader opens a workflow step
- **THEN** the application displays its commit, path, line range when recorded, and captured text or history metadata without presenting a generated explanation as a source fact
