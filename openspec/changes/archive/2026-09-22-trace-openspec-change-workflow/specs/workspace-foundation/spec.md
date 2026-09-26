## MODIFIED Requirements

### Requirement: Honest scaffold interfaces
The CLI SHALL provide help for implemented commands and SHALL reject unsupported or invalid commands without pretending they completed. It SHALL describe the local analysis and supported workflow-trace commands, including their committed-HEAD, local-output, and no-network limits.

#### Scenario: User asks for help
- **WHEN** the CLI runs with no arguments or `--help`
- **THEN** it exits successfully and describes the implemented local analysis and workflow-trace commands and their limits

#### Scenario: User requests an unavailable command
- **WHEN** the CLI receives an unsupported command
- **THEN** it exits with a nonzero status and points to help

#### Scenario: User omits required trace input
- **WHEN** the CLI receives the supported workflow-trace command without its required repository, snapshot, or output input
- **THEN** it exits with a nonzero status and identifies the missing input without creating output
