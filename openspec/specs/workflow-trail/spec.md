# Workflow trail

## Purpose

Provide a reproducible, evidence-first route through one supported repository workflow without treating inferred architecture as source fact.

## Requirements

### Requirement: Curated workflow bundle creation
The system SHALL create a workflow bundle only for a workflow declared in its checked-in catalog and only when the supplied local snapshot and checkout identify the catalog's supported repository revision. The bundle SHALL identify its workflow, repository identity, commit, catalog version, collection time, and ordered evidence steps.

#### Scenario: Supported OpenSpec change-creation workflow is traced
- **WHEN** a user traces the catalogued OpenSpec `new change` workflow against a matching local checkout and snapshot
- **THEN** the system writes a bundle with ordered command entry, specification, implementation, test, and selected-history evidence for that exact revision

#### Scenario: Revision does not match the catalog
- **WHEN** a user attempts to trace the workflow with a checkout or snapshot whose repository identity or commit differs from the catalogued revision
- **THEN** the system rejects the request without writing a bundle and identifies the mismatched identity or revision

### Requirement: Bounded source-cited evidence
The system SHALL capture only the catalog-declared tracked files and selected history records needed for a workflow step. Every captured excerpt SHALL include a repository identity, immutable commit, path, and recorded line range; the bundle SHALL disclose every unavailable, invalid, or truncated item.

#### Scenario: Catalogued evidence is available
- **WHEN** every catalogued path and history record can be read at the supported revision within bundle limits
- **THEN** the bundle includes the captured excerpts and source references without asserting facts beyond their recorded text

#### Scenario: Evidence cannot be captured completely
- **WHEN** a catalogued path is absent, non-text, exceeds a limit, or a selected history record is unavailable
- **THEN** the bundle records the affected item and reason and does not substitute another path or silently claim complete coverage

### Requirement: Local-only workflow capture
The system SHALL obtain workflow evidence from the explicitly selected local checkout and local snapshot, SHALL NOT execute repository code, hooks, filters, or embedded instructions, and SHALL NOT transmit source content over a network.

#### Scenario: A user captures a workflow bundle
- **WHEN** a user runs a valid local trace operation
- **THEN** the operation reads committed repository objects only and writes the result locally without requiring source-sharing consent because no content leaves the machine

#### Scenario: A requested output conflicts with the checkout
- **WHEN** a user requests a bundle output inside the selected checkout or at an existing output location
- **THEN** the system rejects the request before writing repository-derived content
