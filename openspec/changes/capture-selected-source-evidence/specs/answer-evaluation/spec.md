# answer-evaluation delta

## MODIFIED Requirements

### Requirement: Bounded local report assembly
The system SHALL load only explicitly selected local regular files, validate inputs under published bounds, and assemble reports without executing source instructions, invoking Git, or making network requests. It SHALL support cancellation and a deadline, write completed reports atomically outside a repository checkout, and expose no completed report after failure. Hosted trials SHALL remain a separate explicitly approved operation; this reporting operation SHALL NOT dispatch model requests.

The system SHALL accept legacy evidence manifests and a new version supporting optional source-capture paths and identities per revision. Supplied sidecars SHALL be validated against their snapshots and digests, counted against existing combined artifact limits, and recorded in report provenance. Historical citations SHALL remain unavailable unless every required range is completely captured; newly available citations SHALL NOT bypass human review or savings eligibility gates.

#### Scenario: Local reporting completes
- **WHEN** valid bounded trial and evidence inputs are supplied
- **THEN** a validated local report is produced without source transmission or repository execution

#### Scenario: Input is oversized or reporting is canceled
- **WHEN** an input exceeds a bound, is malformed or mismatched, or processing is canceled or times out
- **THEN** the operation fails with a specific reason and publishes no completed partial report

#### Scenario: Complete historical captures are supplied
- **WHEN** matching validated artifacts fully contain the before/after parser and regression-test ranges required by a benchmark
- **THEN** the report marks those citations available while retaining separate semantic assessments and real-trial eligibility checks

#### Scenario: Capture is absent or incomplete
- **WHEN** a sidecar is omitted or lacks complete required lines
- **THEN** reporting retains an unavailable historical finding without filling it from a checkout or commit metadata
