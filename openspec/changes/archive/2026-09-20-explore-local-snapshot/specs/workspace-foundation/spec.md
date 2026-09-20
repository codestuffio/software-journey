## MODIFIED Requirements

### Requirement: TanStack application
The web application SHALL use TanStack Start and TanStack Router with Vite and SHALL NOT use Next.js. It SHALL provide a local, evidence-first snapshot exploration interface for supported local snapshots.

#### Scenario: Contributor starts development
- **WHEN** the contributor runs `pnpm dev`
- **THEN** a React web application is available locally with an explicit snapshot-selection state and the committed-HEAD local analysis boundary

#### Scenario: A reader opens a supported snapshot
- **WHEN** the reader selects a supported snapshot through the application
- **THEN** the application displays the snapshot's recorded evidence and coverage without accessing the target repository from the browser
