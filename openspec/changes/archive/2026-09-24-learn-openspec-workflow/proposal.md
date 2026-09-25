## Why

The explorer presents evidence but leaves readers to decide what to inspect and how to check their understanding. R6 adds one authored lesson for the pinned OpenSpec change-creation workflow, with inspectable evidence and checkpoints leading to a proposed first change.

## What Changes

- Assemble five authored lesson steps from the existing pinned workflow catalog using bounded retrieval.
- Add a guided lesson panel with cited excerpts, explanations labeled as authored guidance, checkpoint feedback, and session progress.
- End with a local first-change planning exercise; no repository mutation occurs.
- Keep unsupported revisions, missing evidence, and truncation visible and prevent incomplete lessons from claiming completion.

Non-goals: provider calls, generated prose, broad architecture inference, persistent learner profiles, arbitrary repository lessons, or code execution.

## Capabilities

### New Capabilities

- `guided-learning`: A local, revision-pinned authored lesson with source evidence and comprehension checkpoints.

### Modified Capabilities

None. Existing explorer and retrieval behavior remains supported.

## Impact

The knowledge package assembles lesson data, contracts validate it, and the web explorer presents it. Browser loading retains validated local input in memory and cancels stale selections. Focused unit and browser tests cover provenance, incomplete evidence, progress, and reset behavior.
