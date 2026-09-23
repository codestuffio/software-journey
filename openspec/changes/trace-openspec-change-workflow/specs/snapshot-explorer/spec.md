## ADDED Requirements

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
