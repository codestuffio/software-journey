## Purpose

Allow users to obtain optional explanations of selected local evidence through an explicit source-sharing approval, with visible provenance, usage, and limits.

## ADDED Requirements

### Requirement: Offline preview and payload-bound approval
The system SHALL preview the exact selected source, endpoint, model, outbound request, input identities, coverage, output cap, pricing basis, and estimated maximum cost without credentials or network access. It SHALL send source only after an explicit approval digest matches a freshly reconstructed preview. Changes to source, identities, model, prompt, or budget SHALL invalidate approval.

#### Scenario: A user previews an explanation
- **WHEN** explain runs without approval
- **THEN** it returns the preview and approval digest locally and makes no provider request

#### Scenario: An approval is missing or stale
- **WHEN** approved execution lacks a matching digest
- **THEN** it fails before credential lookup or any external request

### Requirement: Bounded approved provider execution
The system SHALL send at most one approved request to the fixed OpenAI Responses endpoint with a pinned model, no tools, no redirects, and response storage disabled. It SHALL keep credentials in the Node process and never include them in browser data, reports, or diagnostics. Selected text SHALL remain inert input data.

#### Scenario: A valid approved request runs
- **WHEN** the digest matches and a credential is available
- **THEN** only the previewed request is sent once to the declared provider

#### Scenario: The request cannot run
- **WHEN** credentials are absent, selection is unavailable or history-only, or limits are invalid
- **THEN** execution fails without uploading source or writing a success report

### Requirement: Visible budgets and cancellation
The system SHALL enforce a conservative preflight cost estimate and an output-token cap, support cancellation and a 30-second provider deadline, cap the response at 1 MiB, and perform no automatic retries. It SHALL disclose that the estimate uses pinned published rates and is not a billing guarantee. Post-dispatch failures SHALL report possible charges with unknown usage without exposing provider content.

#### Scenario: A cost estimate exceeds the chosen ceiling
- **WHEN** the input estimate plus output cap exceeds the configured cost ceiling
- **THEN** no request is sent and the user is told to reduce the selection or adjust the limit

#### Scenario: An in-flight request is canceled or fails
- **WHEN** cancellation, timeout, refusal, incomplete output, transport failure, or oversized output occurs after dispatch
- **THEN** no successful report is returned, no retry occurs, and possible billing is disclosed

### Requirement: Labeled and validated explanation reports
The system SHALL produce versioned reports with input identities, selected citations, prompt/model versions, reported usage, elapsed time, cost estimate, and coverage. Generated blocks SHALL be labeled inference, quote, or unknown. Inferences and quotes SHALL cite selected evidence; quotes SHALL match selected source text. Unrecognized citations or invalid output SHALL fail validation. Reports SHALL not claim that citation checks establish semantic truth.

#### Scenario: Output cites selected evidence
- **WHEN** a completed provider response has valid labeled blocks, citations, and usage
- **THEN** a local report is returned with the generated interpretation distinguished from captured facts

#### Scenario: Output invents evidence or an exact quote
- **WHEN** a block cites an unknown source or its purported quote is absent from the selected text
- **THEN** no success report is produced

### Requirement: Local report inspection
The lesson interface SHALL accept reports up to 256 KiB only when their schema, artifact identities, and selected excerpts match the active lesson evidence. It SHALL render generated content as inert text with labels, citations, and usage/cost limitations. Selection failure, lesson replacement, or restart SHALL clear prior explanation state. Report viewing SHALL perform no external request.

#### Scenario: A matching report is opened
- **WHEN** the reader selects a valid report for the active lesson
- **THEN** the model interpretation, source references, and cost estimate appear locally with an unverified-output label

#### Scenario: A report is mismatched or malformed
- **WHEN** the report fails validation or belongs to another artifact set
- **THEN** the interface clears the prior report and explains why it cannot be shown
