# Repository analysis

Reserved for read-only Git inspection, file inventories, documentation extraction, and source references. This is a documented boundary, not a runnable workspace package yet.

Implement through `openspec/changes/analyze-local-repository/`. Never execute code, hooks, package scripts, or instructions from an analyzed repository. Keep process and filesystem access in this Node-only boundary.
