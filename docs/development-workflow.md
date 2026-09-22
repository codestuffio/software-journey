# Development workflow

This repository uses OpenSpec to keep product decisions, implementation work, and AI-assisted sessions aligned.

## Before starting a change

1. Read `docs/product.md`, `docs/roadmap.md`, `docs/architecture.md`, the relevant decision records, and existing capability specs.
2. Select the next roadmap entry whose dependencies are complete.
3. Confirm that its outcome is small enough to demonstrate and verify in one change. Split a larger outcome into independently testable slices before writing a detailed spec.
4. Use `openspec/changes/<change-name>/` for the active change. Its proposal must link to the roadmap entry it advances.

## Define the change

Each active change contains four connected artifacts:

| Artifact | Answers | Minimum bar |
| --- | --- | --- |
| Proposal | Why now, who benefits, and what changes? | Observable outcome, non-goals, and impact. |
| Capability specs | What must be true? | Requirements with success, failure, and coverage scenarios. |
| Design | How does the system meet those requirements? | Boundaries, decisions, alternatives, risks, limits, provenance, and cancellation where relevant. |
| Tasks | What gets built and how is it checked? | Small, ordered checkbox tasks with concrete verification in each task. |

Do not treat a task list as a product specification. Requirements should be clear enough that a reviewer can identify a missing behavior even if the implementation uses a different structure.

## Implement in slices

1. Work from one active change at a time unless independent work has isolated interfaces and separate worktrees.
2. Keep one task small enough to complete, inspect, and verify in a focused session.
3. Read the relevant specs and design before changing code. Record a decision when implementation exposes a meaningful trade-off not already settled.
4. Add focused verification for behavior, error paths, limits, and data boundaries. Do not add tests that only repeat markup or configuration.
5. Run the repository verification gate before handing off work. Inspect user-facing changes at desktop and narrow widths.
6. Keep committed behavior and capability specs in sync. Archive the OpenSpec change only after its tasks and acceptance evidence are complete.

## AI-assisted development rules

- Give an AI a bounded task, the relevant specs, owned files or interfaces, and the expected evidence of completion.
- Require it to distinguish implemented facts, proposed behavior, unknowns, and assumptions.
- Review actual diffs and verification results. A task is not done because an agent says it is done.
- Preserve durable context in source-controlled artifacts: roadmap links, specs, decision records, tests, and concise handoff notes. Do not rely on chat history as the project record.
- Use separate review work for risky changes: trust boundaries, destructive operations, persistence, concurrency, provider calls, and public interfaces.

## Evaluation and release evidence

Every milestone needs evidence that the product outcome works. For this project, record:

- the repository revision and source references behind a claim;
- coverage, omissions, truncation, and incomplete-history status;
- deterministic test results for snapshot and retrieval contracts;
- a small fixed evaluation set for human and agent tasks;
- usability observations for the guided learning path;
- provider, model, prompt, input/output token, latency, and cost metadata for any assisted explanation.

For agent-assisted features, measure answer correctness and citation validity alongside token use, tool calls, latency, and cost. Lower resource use is not a win if answer quality falls.

## Scaling decisions

Use measured triggers instead of speculative infrastructure:

- Keep repository analysis local and modular while one user and one checkout are the primary workflow.
- Add SQLite when local query and indexing needs justify it; add a client/server database when shared concurrent access becomes a real requirement.
- Add background workers when analysis duration or cancellation needs make a single process insufficient.
- Add semantic retrieval only after baseline evaluation shows that direct path and text retrieval misses important answers.
- Add hosted AI only after consent, budget, cancellation, and source-transfer rules are specified and testable.
