## Why

Agents need a compact local view of pinned repository evidence before editing code. Snapshots already identify revisions, extracts, and omissions, but there is no bounded query contract.

## What Changes

- Add versioned request, response, and retrieval evaluation schemas.
- Add local snapshot retrieval with area and exact path filters, hard response limits, citations, and coverage accounting.
- Expose JSON through `software-journey retrieve` and query the R4 fixed catalog with `evaluate-retrieval`.

## Non-goals

No MCP transport, model calls, network transfer, checkout reading, or source extraction beyond the saved snapshot. Code paths without captured text are reported as unavailable.

## Outcome

An agent can request a bounded section of a local snapshot, see which evidence was returned or omitted, and resolve each citation to the snapshot revision, path, and line range.
