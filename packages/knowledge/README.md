# Local evidence retrieval

`@software-journey/knowledge` selects captured evidence from a validated snapshot and optional matching workflow bundle. It has no filesystem, Git, or network access. Contracts are its only runtime dependency.

Use `loadEvidenceArtifacts` from the repository package to read bounded artifact files and validate their identities. Pass the resulting inputs to `discoverEvidence` or `retrieveEvidence`, then use `serializeEvidenceResponse` for compact JSON with exact byte accounting. Callers should pass an AbortSignal covering the whole operation; the CLI applies a 10-second deadline and handles interruption.

Discovery returns descriptors and selectors for documentation and workflow steps, with stable offset pagination. Retrieval accepts exact paths, source references, or workflow/step IDs. It preserves overlapping captures separately and returns recorded history as commit metadata. Inventory entries without text are unavailable.

Responses include the selected revision and artifact identities, coverage, relevant omissions, missing line ranges, and response-budget omissions. `available`, `partial`, and `unavailable` describe evidence availability. They do not grade answer quality or authenticate user-supplied artifacts. Product-authored workflow labels remain separate from captured source text.

The UTF-8 response budget includes JSON metadata, escaping, and the final newline. It defaults to 32,768 bytes and accepts 4,096 through 262,144 bytes. Source trimming preserves complete captured lines and updates citations. An oversized line or history record is omitted whole. Discovery fails with a budget error if its next descriptor cannot fit; callers can increase the budget. Omission details also have a count when they cannot fit.

A recorded null line range stays unknown. A ranged request cannot use it. When collection may have cut a final line short, ranged retrieval omits that boundary line and reports the gap; whole-capture retrieval preserves the captured text and warning. Byte limits do not estimate tokens or provider costs.

Generated lessons, free-text search, MCP, and provider integration remain future work. See the [retrieval design](../../openspec/changes/archive/2026-09-24-retrieve-local-evidence/design.md) and [acceptance procedure](../../docs/acceptance/openspec-retrieval.md).
