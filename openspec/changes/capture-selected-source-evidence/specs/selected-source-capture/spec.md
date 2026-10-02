# Selected source capture delta

## Purpose

Capture explicitly selected committed source ranges as local, bounded evidence so historical citations can be retrieved without accessing or executing the original checkout.

## ADDED Requirements

### Requirement: Explicit committed source selection
The system SHALL accept one to 16 exact repository-relative paths with inclusive positive line ranges from a versioned request limited to 16 KiB. It SHALL require an explicitly selected local checkout and a matching snapshot, pin the committed revision, and read only committed blob content. It SHALL reject malformed paths, traversal, glob selectors, duplicates, and invalid ranges before collection. It SHALL NOT mutate the checkout or substitute working-tree content.

#### Scenario: Selected committed text is captured
- **WHEN** a valid request selects source ranges at the snapshot's matching committed revision
- **THEN** each captured excerpt identifies the repository, exact commit, path, blob, requested range, actual range, and exact text

#### Scenario: Working files differ from committed text
- **WHEN** the selected checkout contains modified or untracked files
- **THEN** collection uses the pinned committed objects and never includes those working files

#### Scenario: Checkout identity or selection is invalid
- **WHEN** the checkout does not match the snapshot or a selector is malformed
- **THEN** collection fails with a specific error and publishes no completed artifact

### Requirement: Mandatory exclusions and explicit missing coverage
The system SHALL preserve credential-like and generated/vendor exclusions and SHALL NOT follow symlinks, submodules, or filesystem paths to obtain selected content. Missing paths/objects, unsupported file modes, binary content, and invalid UTF-8 SHALL produce explicit unavailable selections. It SHALL distinguish available, partial, and unavailable selections and SHALL NOT infer source behavior from inventory or commit metadata.

#### Scenario: Selected source is excluded or absent
- **WHEN** a selected entry is unsafe, excluded, unsupported, missing, or undecodable
- **THEN** the artifact records the selection as unavailable with its reason and no invented source text

#### Scenario: Only part of the requested range exists
- **WHEN** a requested range extends beyond the committed file
- **THEN** capture returns its existing intersection with an actual citation and explicit missing ranges, or reports unavailable when no intersection exists

### Requirement: Fixed collection limits and exact lines
The system SHALL limit reads to 256 KiB per unique blob and 1 MiB combined, captured text to 128 KiB per selection and 512 KiB combined, and the complete serialized artifact to 2 MiB. It SHALL apply a 30-second overall deadline and support cancellation. Returned text SHALL preserve source bytes decoded as strict UTF-8 and trim only at complete line boundaries. Coverage SHALL disclose limit omissions, requested/captured/unavailable selections, and bytes read and returned.

#### Scenario: Source or text limits are reached
- **WHEN** a selected blob exceeds its read cap or selected text cannot fit a capture budget
- **THEN** the affected and remaining selections identify the applicable limits with truthful partial or unavailable coverage and no fabricated line numbers

#### Scenario: A line cannot fit the remaining budget
- **WHEN** the next selected line exceeds the remaining text budget
- **THEN** the line is omitted intact and the returned citation covers only complete retained lines

#### Scenario: Collection is canceled or times out
- **WHEN** cancellation or the overall deadline occurs before publication
- **THEN** child processes terminate and no completed partial artifact is published

### Requirement: Immutable local source artifact
The system SHALL publish a validated versioned artifact bound to the unchanged snapshot identity and repository revision, with capture digests and a reproducible semantic content identity. It SHALL write atomically into a new output directory outside any Git checkout, including symlink-resolved checkout paths, and SHALL NOT overwrite existing output. Run timestamps and absolute local paths SHALL NOT affect semantic content identities.

#### Scenario: Identical selections are repeated
- **WHEN** the same snapshot, committed objects, selections, and limits are used again
- **THEN** semantic identities and captured content match despite different timestamps or local paths

#### Scenario: Publication cannot safely complete
- **WHEN** output exists, resolves inside a checkout, or writing fails
- **THEN** the operation fails without replacing existing content or exposing a completed partial artifact

### Requirement: Inert local collection
The system SHALL NOT execute imported source, hooks, filters, text conversions, or repository-provided instructions, and SHALL NOT fetch or transmit source over a network. Source remains untrusted data. Any future hosted use SHALL require separate explicit approval of selected snippets and provider limits; local collection SHALL NOT grant that approval.

#### Scenario: Selected text asks for execution or upload
- **WHEN** committed source contains instructions to execute commands or send data
- **THEN** those instructions are captured only as text and neither action occurs

#### Scenario: Historical objects are unavailable locally
- **WHEN** a required object is absent from local storage
- **THEN** capture records unavailable evidence and does not attempt a fetch
