## Context

The current snapshot schema intentionally captures inventory, documentation, and bounded history, while the browser has no checkout access. That keeps R1/R2 local and honest, but it cannot show the TypeScript command and test evidence required by the product's OpenSpec onboarding demonstration. See `proposal.md` for motivation and the associated specs for the external contract.

## Goals / Non-Goals

**Goals:**

- Make one OpenSpec `new change` journey reproducible at commit `bae58cf61479986431bb798acbe5a688a591c18c`.
- Preserve the existing snapshot schema and explorer flow while adding a separately validated workflow-bundle format.
- Capture only a reviewed, fixed selection of evidence from committed Git objects, with source references and explicit gaps.
- Let the browser render a local bundle without filesystem, Git, or network capability.

**Non-Goals:**

- Automatically discovering workflows, generalizing from filenames, or explaining architecture with a model.
- Browsing arbitrary repository source from the web application.
- Supporting other OpenSpec revisions or repositories in this first catalog entry.
- Adding persistence, authentication, queues, databases, or a hosted service.

## Decisions

### Use a separate workflow bundle rather than expand every snapshot

`WorkflowBundle` will be a versioned contract that references the snapshot identity and carries only the chosen source excerpts, selected commit metadata, and coverage records. Keeping it separate avoids turning normal snapshot creation into whole-source ingestion and lets an older snapshot remain readable.

The catalog will declare the workflow id, target repository identity and commit, ordered step labels, and allowed evidence selectors. The initial entry will select the CLI registration/command implementation, `change-creation` and `cli-artifact-workflow` specifications, focused command tests, and relevant commit metadata. Catalog labels describe the intended role of a step; they do not make claims about the meaning of uncaptured code.

Alternative considered: adding all source excerpts to `Snapshot`. Rejected because it broadens collection and browser projection for every repository without a demonstrated need. Alternative considered: browser-side checkout reads. Rejected because it violates the established trust boundary.

### Verify inputs before collecting evidence

The trace operation will parse a supplied snapshot, open the explicitly named local checkout through the existing safe Git runner, and compare repository identity and commit with both each other and the catalog. It will read only `HEAD:<catalog path>` objects and the catalogued history references; no caller-provided source paths, glob expansion, shell interpolation, repository code, hooks, filters, or package scripts are used.

The operation will write the bundle to a new output directory with the existing atomic-output pattern. It will reject outputs inside the checkout and existing output locations. Abort signals will propagate through Git reads; cancellation or failure cleans up the temporary output and never exposes a completed-looking bundle.

Alternative considered: accepting arbitrary paths to make the command flexible. Rejected because it would make the first trail a general source-extraction feature without a reviewed product contract.

### Make limits and coverage first-class bundle fields

Contracts will define a fixed maximum number of steps, per-excerpt characters/bytes, total bundle content, and selected history records. The collector will record path-, object-, decoding-, and limit-related failures in bundle coverage. The browser will project already-bounded bundle content again before rendering and will preserve recorded omission text.

### Treat the web interface as a local file viewer

The explorer will accept a workflow bundle through the browser File API only after a snapshot is active. It validates the contract and rejects mismatched repository identity or commit without changing the active snapshot. The workflow view will make step order legible as a trail, use labels such as Command, Specification, Implementation, Test, and History, and show the citation and captured text in the evidence lantern/detail panel.

No browser request, server function, checkout path, or Git command is introduced. Bundle paths remain display-only. The UI will not synthesize narrative beyond catalog-authored labels and explicitly recorded state.

### Record the demonstration as an ignored artifact

The POC command will write the OpenSpec bundle to `.software-journey/poc/openspec/`, alongside the existing ignored snapshot. Acceptance documentation will record the exact command, expected identity/commit, expected step categories, and validation procedure. The third-party source excerpts stay out of version control; only the catalog, schemas, tests, and documentation are committed.

## Risks / Trade-offs

- [The OpenSpec checkout advances or changes source shape] → Pin the initial catalog to the observed commit and fail clearly on mismatch; a later catalog update is an explicit reviewable change.
- [Curated excerpts give a narrow view] → Label the trail as one workflow, show coverage/omissions, and avoid broad architecture claims.
- [Captured source increases local artifact size] → Use fixed step and content limits, atomic output, and browser projection limits.
- [A catalog accidentally broadens source access] → Keep the initial catalog in reviewed source, ban runtime caller-selected paths, and test the exact allowed set.
- [History metadata cannot substantiate intent] → Present subjects only as recorded history metadata and do not convert them into factual explanation.

## Migration Plan

1. Add contracts, collector, catalog, CLI help/validation, and unit coverage while retaining snapshot schema version 1.
2. Add bundle selection and workflow navigation to the existing explorer with browser tests for valid, mismatched, malformed, and incomplete bundles.
3. Generate the ignored OpenSpec POC artifact at the pinned commit and run the documented acceptance checks plus `pnpm verify`.
4. Roll back by removing the new trace command and bundle selector; existing snapshots and R2 explorer behavior remain unchanged because the bundle is additive and separate.
