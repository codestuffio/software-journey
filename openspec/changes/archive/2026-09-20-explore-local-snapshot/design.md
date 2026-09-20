## Context

The repository analyzer emits a versioned JSON snapshot outside the target checkout. The current TanStack Start application is a visual field-guide landing page; it does not load or display snapshot evidence. See [proposal.md](proposal.md) for the product rationale and the `snapshot-explorer` delta specification for behavioral requirements.

## Goals / Non-Goals

**Goals:**

- Make one selected snapshot understandable as an evidence-backed first pass through a repository.
- Preserve provenance and coverage at every exploration level: overview, list, and selected extract.
- Keep data handling local, explicit, and bounded while retaining a polished, keyboard-friendly field-guide interface.
- Establish browser-friendly projections and test fixtures that later workflow and learning features can reuse.

**Non-Goals:**

- Reading an arbitrary filesystem path or repository checkout from browser code.
- Treating documentation extracts as verified architectural explanation, or creating any generated interpretation.
- Query indexing, persistence, remote loading, multi-snapshot comparison, file editing, or deep-linking to an external source host.

## Decisions

### 1. Load an explicit snapshot through a narrow server boundary

The browser will request a supported snapshot through a TanStack Start server function/route that accepts a deliberately configured local demo source or an explicit upload/selection payload and validates it with the existing `snapshotSchema` before exposing it. The server returns an explorer projection, never a repository path or a general filesystem-read capability.

The first demo source is a small checked-in synthetic snapshot fixture. The real OpenSpec POC remains ignored and is not bundled or committed. This keeps the development/demo experience reproducible while respecting the raw-artifact boundary.

**Alternatives considered:** direct browser file APIs would make a private local file selectable but do not give server rendering a stable demo state and would complicate testability; a general `?path=` server endpoint would expand filesystem authority; adding a database is premature for one snapshot.

### 2. Treat the journey as progressive disclosure, not an architecture claim

The primary route is the **trailhead**: a compact survey card showing the commit, recorded date, evidence counts, history state, and visible omissions. The next panel is the **field notes** list, which filters recorded documentation paths. Selecting a result opens an **evidence lantern** detail panel containing captured text plus a citation badge (revision, path, and line range).

The interface uses verbs that describe observation—"recorded," "captured," "not collected"—and reserves "journey" for navigation. It never labels an extract as an explanation of the repository. Empty and failure states appear in the same panel locations so missing evidence cannot be mistaken for a loading or visual error.

**Alternatives considered:** a directory-tree-first layout obscures coverage and overstates files as meaningful; a chat interface invites unsupported inference; a raw JSON viewer offers provenance but not onboarding.

### 3. Keep the first view small and filter locally

The explorer projection limits client-delivered extract text and result count using published caps that are below the analyzer limits. It includes counts for the full recorded snapshot and clearly labels the explorer projection if it is truncated. Filtering runs over recorded paths already in the projection and does not issue repository or network requests. Selection is kept in URL-safe route state when it improves browser navigation, but a path is treated as an opaque display string rather than a command or local file locator.

TanStack Query, Table, and Virtual are intentionally deferred. The synthetic demo and POC usage will establish whether asynchronous caching, tabular controls, or virtualization are needed before adding them.

**Alternatives considered:** shipping every extract with the first response risks a heavy initial page; server-side search would add endpoint semantics without demonstrating need; adding a search/index package before query measurements would be speculative.

### 4. Extend the existing field-guide visual system for evidence work

Retain parchment, mineral, lantern, and terrain accents from the landing page, but make evidence surfaces quieter: high-contrast body text, monospaced metadata, restrained crystal highlights for selection, and a one-column fallback at narrow widths. Motion is limited to short nonessential selection/entry transitions and disabled by `prefers-reduced-motion`. Native buttons, labels, landmarks, focus-visible styles, and live status messaging carry the interaction; decorative mine imagery remains hidden from assistive technology.

**Alternatives considered:** a component library would be disproportionate for this focused screen; a large illustration or animation inside the detail pane would compete with cited content; a dark code-editor theme would clash with the product's field-guide identity and reduce long-form reading comfort.

## Trust Boundaries

| Boundary | Rule |
| --- | --- |
| Filesystem | Only a specific snapshot source selected by the application boundary is read; the target checkout and arbitrary server paths are never exposed to the browser. |
| Process | Explorer code starts no Git command, package script, hook, or repository process. |
| Network | No explorer request sends source text to an external service; no provider or remote source link is invoked automatically. |
| Browser | The client receives validated, size-bounded evidence data. Paths and extract text are rendered as text, never HTML or executable instructions. |
| Provenance | Every extract carries the recorded repository identity, commit, path, and optional line range; coverage and omissions remain separate metadata. |

## Risks / Trade-offs

- [A real snapshot can be much larger than the demo] → Cap explorer payloads, show projection truncation, and defer indexing/virtualization until measured usage warrants them.
- [Snapshot text can contain hostile markup or instructions] → Render all evidence as escaped text; never interpret, execute, or follow its contents.
- [A polished visual style can hide trust limits] → Place coverage and omission status in the trailhead, before lists or detail text.
- [A selection route can expose confusing malformed state] → Validate route state against the loaded projection and fall back to an explicit no-selection panel.
- [Server rendering can accidentally make local data look globally available] → Label the view as a local session and omit persistence/sharing affordances.

## Migration Plan

1. Add a deterministic synthetic snapshot fixture and validate it through the same contract used by the explorer boundary.
2. Replace the static landing focus with the trailhead and field-notes explorer while retaining the product's visual identity.
3. Add focused contract and UI tests for valid, invalid, empty, filtered, and coverage-limited states; run browser tests at desktop and narrow widths.
4. Analyze the ignored OpenSpec POC snapshot manually in the explorer, record the revision and citation check, then sync/archive the capability change after all acceptance evidence is complete.

Rollback is a route/UI rollback: no snapshot is persisted or migrated, and the analyzer output remains compatible because the explorer consumes only schema version 1 snapshots.

## Open Questions

- Whether selecting a user-owned local file should use a browser file picker or an explicit local server import command can be decided after the reproducible fixture flow proves the explorer interaction; it does not change the evidence or trust contract.
