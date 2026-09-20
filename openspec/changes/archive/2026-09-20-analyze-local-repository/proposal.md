# Read-only local repository analysis

## Why

Guided onboarding needs reliable evidence before it can explain a project. The first slice should inventory a local repository, its documentation, and a bounded history without requiring a model or running the target project's code.

## Roadmap

Advances [`docs/roadmap.md` → R1](../../../docs/roadmap.md): local repository evidence. The roadmap owns this milestone's relationship to later explorer, workflow, and agent-retrieval work; this change owns the bounded evidence pipeline only.

## What Changes

- Add a CLI analysis command for a local Git checkout at committed HEAD.
- Produce a versioned local snapshot with file inventory, documentation extracts, source references, and bounded commit metadata.
- Report exclusions, limits, dirty-worktree omissions, and incomplete history.
- Add deterministic synthetic Git fixtures and use OpenSpec at a pinned commit as a manual acceptance case.

## Capabilities

### New Capabilities
- `repository-analysis`: read-only, bounded local Git evidence collection.

### Modified Capabilities
- `workspace-foundation`: extend CLI guidance once analysis is actually available.

## Impact

`apps/cli`, `packages/repository`, and `packages/contracts` gain behavior. The web UI remains a shell until a separate explorer change. Analysis artifacts stay local and ignored.

## Non-goals

No model calls, remote cloning, dependency installation, code execution, working-tree overlays, semantic call graph, whole-history mining, or tutorial generation. No source content leaves the machine.
