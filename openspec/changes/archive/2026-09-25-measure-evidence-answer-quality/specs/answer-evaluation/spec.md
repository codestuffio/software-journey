# Answer evaluation

## Purpose

Support reviewable local comparisons of repository answers against revision-pinned reference criteria, separating human quality judgments from deterministic evidence checks and resource measurements.

## ADDED Requirements

### Requirement: Versioned reference criteria
The system SHALL accept a versioned benchmark with repository identity, exact revisions, question IDs, required answer points, permitted uncertainty, and immutable expected citations. Historical behavior-change questions SHALL identify before and after evidence separately; commit metadata alone SHALL NOT establish a behavior change.

#### Scenario: Supported reference criteria are supplied
- **WHEN** a valid benchmark and matching evidence are supplied
- **THEN** the report identifies the benchmark version, evidence identities, and reference criteria for each question

#### Scenario: Historical evidence is insufficient
- **WHEN** a historical question lacks required before or after evidence or includes truncated required lines
- **THEN** the report marks that question unavailable for a supported quality comparison and explains the missing coverage

### Requirement: Explicit human assessment
The system SHALL record an identified human reviewer's assessment of correctness, citation support, and handling of uncertainty, including reasons and a binding to the exact answer and benchmark content identities. It SHALL report unreviewed answers as unreviewed, reject stale assessments, and SHALL NOT infer semantic correctness from resolvable citations.

#### Scenario: An answer is assessed
- **WHEN** a matching assessment is supplied
- **THEN** the report preserves the reviewer, reasons, dimension outcomes, and separately computed citation findings

#### Scenario: An assessment is stale or absent
- **WHEN** an assessment refers to different answer content or benchmark content, or no assessment exists
- **THEN** stale input is rejected and absent assessment is reported as unreviewed without a quality pass

### Requirement: Comparable paired trial records
The system SHALL compare direct-exploration and retrieval trials only when question, benchmark, repository revisions, participant or model configuration, and declared budgets match. Each trial SHALL declare synthetic or real provenance and a repetition identifier. The report SHALL show sample counts and exclude unmatched, synthetic, unavailable, failed-quality, and unreviewed trials from claims of demonstrated quality-preserving savings.

#### Scenario: Matching real reviewed trials are supplied
- **WHEN** matching paired trials meet all quality criteria
- **THEN** the report shows per-pair measured differences and sample counts without generalizing beyond those trials

#### Scenario: Trials cannot support a comparison
- **WHEN** trials differ in configuration, lack a counterpart, or are synthetic or unreviewed
- **THEN** the report lists the reason and makes no demonstrated savings claim for those trials

### Requirement: Measured resource provenance
The system SHALL preserve elapsed time, tool-call counts, and UTF-8 byte measurements with declared measurement scope and provenance. Token counts and account costs SHALL remain unknown unless supplied with measurement provenance; bytes SHALL NOT be converted into claimed token or cost savings. Failed-quality pairs SHALL retain their measured resource differences but SHALL NOT qualify as successful savings.

#### Scenario: Only byte measurements exist
- **WHEN** trials supply measured bytes but no measured tokens or account cost
- **THEN** the report shows byte differences and labels tokens and costs unknown

#### Scenario: A cheaper answer fails quality criteria
- **WHEN** a retrieval answer uses fewer measured resources but fails a required assessment dimension
- **THEN** the report records the quality failure and does not count that pair as quality-preserving savings

### Requirement: Bounded local report assembly
The system SHALL load only explicitly selected local regular files, validate inputs under published bounds, and assemble reports without executing source instructions, invoking Git, or making network requests. It SHALL support cancellation and a deadline, write completed reports atomically outside a repository checkout, and expose no completed report after failure. Hosted trials SHALL remain a separate explicitly approved operation; this reporting operation SHALL NOT dispatch model requests.

#### Scenario: Local reporting completes
- **WHEN** valid bounded trial and evidence inputs are supplied
- **THEN** a validated local report is produced without source transmission or repository execution

#### Scenario: Input is oversized or reporting is canceled
- **WHEN** an input exceeds a bound, is malformed or mismatched, or processing is canceled or times out
- **THEN** the operation fails with a specific reason and publishes no completed partial report
