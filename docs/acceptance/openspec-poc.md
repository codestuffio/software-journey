# OpenSpec local-analysis POC

Date: 2026-09-20

## Target

- Checkout: `/Users/adam/Documents/GitHub/OpenSpec`
- Committed `HEAD`: `bae58cf61479986431bb798acbe5a688a591c18c`
- Local output: `.software-journey/poc/openspec/snapshot.json` (ignored; not committed)

## Result

The CLI created a schema version 1 snapshot with content identity `sha256:835e31afbc57a20d8a0d43f6048ef93af48423609ebb4d561cffe79216d40de0`.

- 1,221 tracked inventory entries recorded
- 705 documentation extracts from 706 eligible files; 3,842,569 extracted bytes
- 200 commit records; history marked `limited` because it reached the configured cap
- 0 omissions in this checkout

The checkout's `HEAD` remained `bae58cf61479986431bb798acbe5a688a591c18c` and its working-tree status remained clean after analysis.

## Manual citation check

The first snapshot citation resolves to `.agents/skills/draft-openspec-docs/SKILL.md`, lines 1–47, at `bae58cf61479986431bb798acbe5a688a591c18c`. Its snapshot text matches the file content at that commit. The latest recorded commit is the same SHA with subject `docs: fix Docslab links to unfinished pages (#1903)`.
