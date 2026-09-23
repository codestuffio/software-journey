## Contract and boundaries

`packages/knowledge` validates a version 1 request and snapshot before selecting documentation extracts. The request pins repository identity, commit, and snapshot content identity. A path is exact; an area matches that directory and descendants. Retrieval never opens a checkout or performs network or process calls. The CLI reads the named local snapshot and prints one JSON response to stdout.

The response carries returned source text with the pinned repository, revision, path, and displayed line range. It reports matching inventory and extract counts, unavailable inventory entries, omitted results, snapshot omissions, and whether result text was truncated. Omission records are capped and the number not reported is explicit. Global snapshot coverage counts remain visible without copying its unbounded omission list.

The hard caps are 24 evidence entries, 8,000 characters per entry, and 48 omission records. Text truncation changes the cited ending line to the displayed text's ending line. Selection follows snapshot order for reproducibility. Invalid identities, versions, limits, or serialized inputs fail closed.

R4's fixed catalog is queried through the same retrieval function. Each case records whether its source resolves and the coverage returned by that query. The catalog stays pinned to its repository revision. Code files absent from snapshot extracts remain unavailable, making that limitation measurable.

## Trust and lifecycle

Imported snapshot text is untrusted data. No scripts or embedded instructions are executed. The command has no output directory or durable writer; consumers choose whether to save stdout. A failed parse emits no JSON manifest. Cancellation is not needed for this synchronous bounded in-memory operation. No source leaves the local machine automatically.
