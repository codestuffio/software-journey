## MODIFIED Requirements

### Requirement: Honest scaffold interfaces
The CLI SHALL provide help for implemented commands and SHALL reject unsupported commands without pretending they completed.

#### Scenario: User asks for help
- **WHEN** the CLI runs with no arguments or `--help`
- **THEN** it exits successfully and describes the implemented local analysis command and its limits

#### Scenario: User requests an unavailable command
- **WHEN** the CLI receives an unsupported command
- **THEN** it exits with a nonzero status and points to help
