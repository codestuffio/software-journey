# Product direction

Software Journey helps a developer understand a repository well enough to make a first useful change. It also gives agents a compact, inspectable way to find the evidence they need before changing code.

## Decisions made

- Local-first. Analyze a checkout on the user's machine and keep source local by default.
- Prioritize guided onboarding: understand the architecture and trace one real workflow.
- Hosted AI is optional after local indexing. Require explicit approval before sending selected snippets.
- First demonstration: [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec).
- React, TypeScript, Node, and TanStack Start. Never use Next.js.
- pnpm workspaces and Turborepo; Vite is the TanStack-compatible bundler.
- Develop through OpenSpec proposals, requirements, designs, and tasks.
- Intended GitHub home: `codestuffio/software-journey`, created manually by the owner.

## Intended experience

A developer selects a local checkout and a revision. The application reports what it read, what it skipped, and whether history is incomplete. An overview explains the project's purpose and major parts. The reader can follow a workflow through specific files, inspect the history around a change, or open a more detailed explanation.

An agent uses the same evidence through a compact manifest and bounded retrieval. It can discover available areas, request a relevant section, and expand to exact source references. Every response identifies its revision, truncation, and coverage. The UI and agent interface share evidence rather than maintaining separate explanations.

Code and documentation can disagree. Commit messages record author claims, not proof of intent. The application must distinguish observed facts, quoted documentation, inferred explanations, and unknowns. Missing evidence should remain visible.

## Proposed milestones

| Milestone | Deliverable | Acceptance signal |
| --- | --- | --- |
| 0. Foundation | Workspace, shell, OpenSpec, CI | Fresh install and `pnpm verify` pass |
| 1. Repository evidence | Read-only checkout inspection, documentation inventory, bounded history, snapshot manifest | Synthetic fixtures cover exclusions, symlinks, missing history, empty repositories, and deterministic output |
| 2. Explorer | Overview, file/doc navigation, source citations, history coverage | A user traces one chosen OpenSpec workflow to source at a pinned revision |
| 3. Guided learning | Tutorial steps and deeper explanations, optionally assisted by a model | Each repository-specific factual claim is traceable; inferred claims are labeled; provider budget and cancellation work |
| 4. Agent access | Versioned JSON context and bounded retrieval, then an MCP adapter if useful | Fixed tasks compare answer quality, tokens, tool calls, latency, and cost against direct repository exploration |

Milestones 1-4 are proposed work, not implemented functionality. The first change under `openspec/changes/analyze-local-repository/` is intentionally limited to deterministic evidence collection.

## First demonstration

Use a full local checkout of OpenSpec, record its exact commit, and choose one meaningful workflow such as proposal creation or change archival. The tutorial should connect its CLI entry point, the related specification, implementation, tests, and selected history. Verify those connections from the selected revision before publishing any explanation.

Keep the checkout outside this source tree or in ignored `.local/repos/`. Record upstream license and attribution with any redistributed excerpts. Do not vendor OpenSpec or automatically install its dependencies as part of analysis.

## Evaluation

Start with five fixed questions: project entry point, one command's execution path, the spec governing it, the tests proving it, and an example of behavior changing over history. Curate reference answers against a pinned revision before measuring any model.

Compare direct file/search exploration with generated-context retrieval using the same model, task set, revision, and budgets. Record correctness and citation validity alongside input/output tokens, tool calls, wall-clock time, and cost. Use repeated trials; fewer tokens with a worse answer is a failure. Do not claim savings until measured.

Proposed pilot success: a developer can explain one workflow and identify a safe first change within 15 minutes; all cited paths/revisions resolve; agents preserve answer quality while reducing total context use. These thresholds need a real baseline before becoming release gates.

## Questions to settle

| Question | Recommendation | Needed before |
| --- | --- | --- |
| Provider and model budget | Pick one provider first; set per-run spend and token caps | Generated tutorials |
| Supported repositories | TypeScript/JavaScript first; generic text/docs and Git metadata for others | Language-aware indexing |
| History default | Selected revision plus a bounded recent history; disclose shallow/missing history | Ingestion implementation |
| Dirty working trees | Snapshot committed HEAD first and warn that uncommitted changes are excluded | Ingestion implementation |
| Distribution license | Owner chooses before public distribution | Publication |

## Outside the first release

Hosted multi-tenant GitHub ingestion, accounts, billing, continuous indexing, code execution, autonomous code modification, exhaustive whole-history analysis, and an elaborate vector database are deferred. Add them only when the local learning experience demonstrates a need.
