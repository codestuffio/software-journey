## MODIFIED Requirements

### Requirement: Honest scaffold interfaces
The CLI SHALL provide help for implemented commands and SHALL reject unsupported or invalid commands without pretending they completed. It SHALL describe the local analysis, workflow-trace, and evidence-evaluation commands, including their committed-HEAD, local-output, and no-network limits. It SHALL also describe artifact-only context discovery and evidence retrieval, including their JSON output, byte budgets, and absence of checkout or network access.

#### Scenario: User asks for help
- **WHEN** the CLI runs with no arguments or `--help`
- **THEN** it exits successfully and describes the implemented local analysis, workflow-trace, evidence-evaluation, context-discovery, and evidence-retrieval commands and their limits

#### Scenario: User requests an unavailable command
- **WHEN** the CLI receives an unsupported command
- **THEN** it exits with a nonzero status and points to help

#### Scenario: User omits required trace input
- **WHEN** the CLI receives the supported workflow-trace command without its required repository, snapshot, or output input
- **THEN** it exits with a nonzero status and identifies the missing input without creating output

## ADDED Requirements

### Requirement: Machine-readable evidence commands
The CLI SHALL expose `context` with a required snapshot, optional bundle, byte budget, and pagination offset, and `retrieve` with a required snapshot and request file plus optional bundle. These commands SHALL emit one versioned JSON response to stdout on valid requests and put diagnostics on stderr. Available, partial, and unavailable evidence responses SHALL exit zero. Invalid arguments or inputs, cancellation, deadline expiry, and response-construction failures SHALL exit nonzero without publishing a successful response.

#### Scenario: A valid retrieval request finds no evidence
- **WHEN** the retrieve command receives valid artifacts and a valid selector that has no captured evidence
- **THEN** stdout contains an unavailable JSON response and the process exits zero

#### Scenario: A caller provides invalid command arguments
- **WHEN** a context or retrieve invocation has missing values, unknown or duplicate flags, conflicting selectors, or invalid numeric bounds
- **THEN** it exits nonzero with a diagnostic on stderr and no success JSON on stdout

#### Scenario: A caller consumes bounded JSON
- **WHEN** a valid context or retrieve operation finishes
- **THEN** stdout contains only the complete response and its trailing newline within the selected byte budget
