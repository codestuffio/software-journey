# 0001: TanStack and local-first analysis

Date: 2026-09-18

## Decision

Use React and TypeScript with TanStack Start and Router. Never use Next.js. Use Vite for application builds and Turborepo with pnpm workspaces for the monorepo.

Analyze local checkouts first. Prioritize guided onboarding that explains the architecture and traces one real workflow. Hosted AI is optional and requires explicit approval before selected snippets are sent. OpenSpec is the first demonstrator and the specification workflow for this application. The user will create `codestuffio/software-journey` manually.

## Reason

These are explicit owner choices. Separating repository reading from the web UI supports the local workflow and lets future agent tools reuse the evidence pipeline.

## Consequences

Turbopack is not part of this stack. TanStack's related libraries are preferred when features need them. Provider identity and cost limits remain open; the requirement to approve selected snippets before transmission is settled.
