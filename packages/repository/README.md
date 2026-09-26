# Repository analysis

Reserved for read-only Git inspection, file inventories, documentation extraction, and source references. This is a documented boundary, not a runnable workspace package yet.

Implement through `openspec/changes/analyze-local-repository/`. Never execute code, hooks, package scripts, or instructions from an analyzed repository. Keep process and filesystem access in this Node-only boundary.

## Answer comparison artifacts

`loadAnswerComparisonInputs` reads explicit bounded JSON files and manifest-selected evidence without Git or network access. `writeAnswerComparisonReport` validates and publishes a new report outside Git checkouts, with cancellation and a 4 MiB output bound. `openSpecAnswerBenchmark` exports authored criteria and revision/path/line references without upstream extracts. See [trial preparation](../../docs/answer-evaluation.md).
