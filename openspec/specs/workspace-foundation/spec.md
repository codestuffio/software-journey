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
