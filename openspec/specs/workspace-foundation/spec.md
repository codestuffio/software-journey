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
The web application SHALL use TanStack Start and TanStack Router with Vite and SHALL NOT use Next.js.

#### Scenario: Contributor starts development
- **WHEN** the contributor runs `pnpm dev`
- **THEN** a React web shell is available locally and identifies repository analysis as not yet implemented

### Requirement: Honest scaffold interfaces
The CLI SHALL provide setup guidance and SHALL reject unsupported commands without pretending to analyze a repository.

#### Scenario: User asks for help
- **WHEN** the CLI runs with no arguments or `--help`
- **THEN** it exits successfully and states that analysis is not implemented

#### Scenario: User requests an unavailable command
- **WHEN** the CLI receives an unsupported command
- **THEN** it exits with a nonzero status and points to help
