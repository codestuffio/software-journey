# Bounded agent retrieval acceptance

At the local Software Journey commit `4e3023acb8b13ccef6f518074c1bc7d151c06011`, the compiled CLI analyzed its own checkout and retrieved `--area docs --max-evidence 1 --max-characters 40`. The response recorded 15 matching extracts, one returned extract, 14 omitted by the result limit, and `resultTruncated: true`. The returned excerpt cited `docs/acceptance/openspec-evaluation-baseline.md` at the same commit, lines 1–3; its text was the corresponding prefix in the saved snapshot.

The pinned OpenSpec snapshot was queried with `evaluate-retrieval`. Its five R4 cases reported one resolved citation (`openspec/specs/change-creation/spec.md`) and four unavailable cases. The unavailable code and history paths appeared in the snapshot inventory but had no captured text. Each case reported its matching extract and unavailable inventory counts. This is the measured boundary of snapshot-only retrieval; it must not be interpreted as evidence about uncaptured source text.

`pnpm verify` passed on Node 22.23.1, including 26 Vitest tests, two smoke tests, and strict validation of the new OpenSpec change.
