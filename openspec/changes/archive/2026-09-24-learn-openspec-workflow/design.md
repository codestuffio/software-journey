## Context

R5 provides artifact-only retrieval. The browser currently holds bounded explorer projections, and the reviewed workflow catalog supports one pinned OpenSpec revision. See proposal.md for motivation.

## Goals / Non-Goals

Turn that reviewed trail into a lesson without inference or network access. Keep raw validated inputs in browser memory only while the session is active. No lesson persistence, provider call, or repository modification is introduced.

## Decisions

The knowledge package owns a versioned authored lesson catalog for the same repository identity, revision, workflow ID, and ordered step IDs as the existing workflow catalog. Each step has a title, reading guidance, a role-based multiple-choice checkpoint, feedback, and one bounded retrieval result. Catalog claims describe evidence roles and reading methods; they do not invent code behavior. Repository-specific statements remain attached to captured source references. History identifies a revision, not a proven behavior change.

Assemble from validated full snapshot/bundle inputs with a 32 KiB budget per step and a 10-second abortable assembly deadline. Match snapshot content identity as well as revision. Verify each expected source path and kind against its catalog entry. Do not reuse the browser projection as if it were full evidence. Missing, collection-truncated, or response-truncated step evidence disables its checkpoint and prevents lesson completion. Global limited history is disclosed but does not block a present revision-metadata checkpoint.

The browser loader keeps its existing size limits. Add a session loader retaining the parsed snapshot for assembly. Abort and invalidate pending selections when a new snapshot, workflow, or sample is selected. A lesson component keyed by both artifact identities resets progress; restarting explicitly resets it as well. Lesson data and first-change notes stay in memory.

Use a focused React component with previous/next buttons, a five-step navigation list, semantic radio groups, live feedback, and responsive source blocks. Guidance, captured quotes, unknowns, and learner notes are labeled separately. Completion requires five correct checkpoints and a nonblank first-change plan describing a behavior, relevant spec, and test; this is a self-reported exercise, not a claim of proven competence. Offer a local text download of the plan and citations.

## Risks / Trade-offs

- Curated material supports one revision only. Show an unsupported lesson state without disabling normal exploration.
- Source files can exceed the step budget. Show the limitation and prevent completion; do not silently increase the budget.
- Checkpoints test evidence roles, not deep code comprehension. Label completion as lesson progress and keep the final exercise self-reported.

## Migration Plan

Add contracts and lesson assembly, integrate the browser session loader and panel, then validate unit tests, browser tests, and the pinned artifacts. Existing artifacts remain unchanged. Remove the additive lesson feature to roll back.
