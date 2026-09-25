# OpenSpec guided lesson acceptance

The authored lesson supports the existing `openspec-new-change` workflow at `bae58cf61479986431bb798acbe5a688a591c18c`.

On 2026-09-24, assembly from the ignored pinned snapshot and bundle produced five ready checkpoints. Command, specification, implementation, test, and revision evidence each fit the 32 KiB step budget. The snapshot's limited history remains disclosed. No model was called and no imported code was executed.

`pnpm verify` passed, including 45 unit/integration tests, two runtime smoke checks, and strict OpenSpec validation. `pnpm test:e2e` passed all seven browser tests. New browser cases cover wrong-answer feedback, all five checkpoints, keyboard operation at a 390px viewport, plan export, restart, unavailable evidence, and replacement of an in-flight workflow selection.

Open the pinned snapshot, then its workflow bundle in the explorer. The authored lesson appears below the workflow trail. Complete the role-based checkpoints and write a first-change plan to export notes and immutable citations. Progress is local session state and is not a claim that the reader can safely modify the repository without further validation.
