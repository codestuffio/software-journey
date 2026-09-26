# Workspace foundation

## Purpose

Provide a reproducible local foundation for developing Software Journey through OpenSpec.

## Requirements

### Requirement: Reproducible workspace
The project SHALL provide a pinned pnpm workspace with strict TypeScript, build orchestration, and a local verification command.

#### Scenario: Contributor verifies the scaffold
- **WHEN** a contributor installs the committed lockfile with the documented Node and pnpm versions and runs `pnpm verify`
- **THEN** the workspace runs formatting/lint, type checks, production builds, runtime smoke tests, and strict specification validation

### Requirement: TanStack application
The web application SHALL use TanStack Start and TanStack Router with Vite and SHALL NOT use Next.js. It SHALL provide a local, evidence-first snapshot exploration interface for supported local snapshots.

#### Scenario: Contributor starts development
- **WHEN** the contributor runs `pnpm dev`
- **THEN** a React web application is available locally with an explicit snapshot-selection state and the committed-HEAD local analysis boundary

#### Scenario: A reader opens a supported snapshot
- **WHEN** the reader selects a supported snapshot through the application
- **THEN** the application displays the snapshot's recorded evidence and coverage without accessing the target repository from the browser

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
