# Snapshot explorer OpenSpec POC

Date: 2026-09-20

## Target

- Snapshot: ignored local `.software-journey/poc/openspec/snapshot.json`
- Repository revision: `bae58cf61479986431bb798acbe5a688a591c18c`
- Snapshot identity: `sha256:835e31afbc57a20d8a0d43f6048ef93af48423609ebb4d561cffe79216d40de0`

## Explorer result

The browser file-selection flow accepted the 4,526,460-byte local snapshot without accessing the OpenSpec checkout. It displayed the recorded coverage (1,221 inventory entries, 705 documentation extracts from 706 eligible files, and 200 recorded commits with `limited` history) and the `history-limit` omission.

The local view displayed 48 field notes, its published projection cap, while retaining the full recorded count. Selected notes display captured text and their recorded immutable citation. The existing manual citation check remains resolvable at `.agents/skills/draft-openspec-docs/SKILL.md`, lines 1–47, at the target revision.

No raw OpenSpec snapshot or source content was added to Git.
