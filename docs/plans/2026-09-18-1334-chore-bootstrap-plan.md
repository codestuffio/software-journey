---
title: Software Journey foundation - Plan
type: chore
date: 2026-09-18
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# Software Journey foundation - Plan

## Goal Capsule

Give contributors a runnable, spec-driven starting point for a repository learning application. This plan authorizes the scaffold and planning documents only. Repository ingestion, model calls, and generated tutorials are later changes.

## Product Contract

### Problem Frame

Developers reconstruct a project's structure and intent from scattered source, README files, documentation, and commit history. Agents repeat much of this work while consuming context and tool calls. Both need a navigable explanation grounded in the same evidence.

### Summary

Create a React, Node, and TypeScript workspace with OpenSpec as the feature specification system. Record the proposed product in `docs/product.md`, including questions that must be answered before implementing analysis.

### Requirements

- R1. A fresh checkout installs reproducibly and exposes development, build, formatting, and type-check commands.
- R2. The workspace contains a React web application, a Node CLI entry point, and shared contracts, with documented locations for future repository analysis and knowledge generation.
- R3. The repository includes ignore rules, contribution guidance, agent guidance, CI, and an OpenSpec proposal/design/spec/tasks workflow.
- R4. The web shell clearly states that analysis is not implemented; the scaffold requires no AI credentials and sends no repository contents to a provider.
- R5. The product plan covers human onboarding and bounded, source-linked agent exploration, including a demonstrator and evaluation approach.

### Scope Boundaries

No repository cloning, ingestion, hosted authentication, database, model-provider integration, MCP server, or deployment in this change. No open-source license is selected without the owner's decision. The user will create `codestuffio/software-journey` on GitHub manually.

## Planning Contract

### Key Technical Decisions

- KTD1. Use pnpm workspaces and Turborepo for workspace tasks. Use TanStack Start, TanStack Router, and Vite for the React app. Never use Next.js. Turbopack is replaced by Vite for Start compatibility. (session-settled: user-directed — TanStack Start chosen over Next.js as the required application framework.)
- KTD2. Use a small standalone Node CLI as the future local ingestion entry point. Keep filesystem access out of browser components.
- KTD3. Use strict TypeScript and Biome. Pin tool versions and commit the lockfile. Use the existing Node 22 runtime with a documented minimum.
- KTD4. Keep product choices provisional in `docs/product.md`. OpenSpec capability specs describe delivered behavior; active changes describe proposed behavior.

### Assumptions

The working name is Software Journey. The user selected local-first analysis and OpenSpec as the first demonstration; neither analysis nor the demonstration is implemented by this scaffold.

## Implementation Units

### U1. Bootstrap the workspace

Goal: satisfy R1-R4 with a runnable foundation.

Files: root tooling configuration, `apps/web/`, `apps/cli/`, `packages/contracts/`, `packages/typescript-config/`, `.github/`, `openspec/`, `README.md`, `CONTRIBUTING.md`, `AGENTS.md`.

Dependencies: none. Follow KTD1-KTD4 and the official references below. Prefer install/build/runtime checks over tests that only restate scaffold markup. A persistent smoke test should exercise the compiled CLI and production web server together.

Verification: a frozen install, format/lint, strict types, production build, CLI smoke test, HTTP smoke test, and strict OpenSpec validation pass. The page also works at narrow viewport widths. Invalid CLI commands fail clearly.

### U2. Record the product direction

Goal: satisfy R5 without presenting future functionality as implemented.

Files: `docs/product.md`, `docs/architecture.md`, `docs/research.md`, `docs/decisions/`, and an initial proposed analysis change under `openspec/changes/`.

Dependencies: U1's package boundaries. Record unresolved deployment, provider, privacy, licensing, and demonstration choices. Verification: each planned milestone has an observable acceptance criterion; docs link to real local files or sources. Test expectation: none, documentation only.

## Verification Contract

`pnpm verify` is the contributor and CI gate: formatting/lint, types, build, smoke tests, and strict OpenSpec validation. Verify ignored files cover credentials, imported repositories, derived analysis, and build outputs while allowing example configuration. Inspect the starter page at desktop and mobile sizes.

## Definition of Done

U1 is done when the workspace runs and its checks pass. U2 is done when a contributor can identify the next proposed change and the user decisions it depends on. Remove abandoned experiments. Report GitHub publication separately from local completion; an unauthenticated remote is not a completed repository setup.

## Sources

- [OpenSpec](https://github.com/Fission-AI/OpenSpec): canonical change artifacts and tool initialization.
- [TanStack Start setup](https://tanstack.com/start/latest/docs/framework/react/build-from-scratch): Router and Vite setup.
- [Turborepo structure](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository): application and shared package boundaries.
- [GitHub Spec Kit](https://github.com/github/spec-kit): alternative demonstration candidate.
