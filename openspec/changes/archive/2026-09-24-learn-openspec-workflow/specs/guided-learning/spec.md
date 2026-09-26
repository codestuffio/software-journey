## Purpose

Guide a reader through a reviewed repository workflow using authored reading guidance, cited local evidence, and explicit comprehension checkpoints.

## ADDED Requirements

### Requirement: Pinned lesson assembly
The system SHALL offer a versioned five-step authored OpenSpec change-creation lesson only for its supported repository identity, revision, workflow, and matching snapshot content identity. Each step SHALL retrieve its declared evidence within 32 KiB and distinguish authored guidance from captured source text and history metadata.

#### Scenario: Supported artifacts are selected
- **WHEN** a reader loads matching supported artifacts
- **THEN** the lesson presents command, specification, implementation, test, and revision steps with their immutable evidence references

#### Scenario: Artifacts are unsupported or inconsistent
- **WHEN** the revision, workflow, snapshot identity, or declared evidence path/kind does not match
- **THEN** the lesson is unavailable with a reason and makes no substituted repository claim

### Requirement: Honest lesson coverage
The lesson SHALL show collection and response limitations. Missing or truncated step evidence SHALL disable that step's checkpoint and prevent completion. Assembly SHALL support cancellation and a 10-second deadline, with no stale lesson replacing a newer selection.

#### Scenario: A required source is missing or truncated
- **WHEN** the required evidence is unavailable or incomplete within the step budget
- **THEN** its limitation is shown and the lesson cannot be marked complete

#### Scenario: History coverage is limited
- **WHEN** the revision record is available but surrounding history is limited
- **THEN** the lesson identifies the recorded revision and discloses incomplete history without claiming a behavioral history analysis

#### Scenario: The selected session changes during loading
- **WHEN** another snapshot, bundle, or sample replaces an in-flight selection
- **THEN** pending assembly is canceled or ignored and no old progress or lesson is shown for the new selection

### Requirement: Local learning checkpoints
The interface SHALL provide ordered navigation, per-step role-based questions, answer feedback, and session progress. It SHALL mark a lesson complete only after all five available checkpoints are answered correctly and the reader supplies a nonblank first-change plan. Progress SHALL be labeled as a self-reported learning exercise and SHALL reset on restart or artifact replacement.

#### Scenario: A reader answers incorrectly then retries
- **WHEN** the reader submits an incorrect answer
- **THEN** the interface explains the evidence role, leaves the checkpoint incomplete, and permits another attempt

#### Scenario: A reader completes the lesson
- **WHEN** every checkpoint is correct and a first-change plan is supplied
- **THEN** the interface reports lesson completion and offers a local text export of the plan and source references

#### Scenario: The reader restarts
- **WHEN** restart is selected or either artifact is replaced
- **THEN** answers, completion state, and first-change notes are cleared

### Requirement: Local and accessible lesson experience
The lesson SHALL be keyboard-operable and usable at narrow widths, render source as inert text, and keep artifacts, answers, and notes local without network transmission or repository execution.

#### Scenario: A reader works through a lesson
- **WHEN** the reader navigates, answers, or exports a plan
- **THEN** controls have accessible names, feedback is announced, and no source or notes are sent over a network
