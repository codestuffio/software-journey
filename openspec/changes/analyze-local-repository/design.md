# Design

## Context

The workspace is a scaffold. There is no repository reader or persisted snapshot format yet. Build a deterministic evidence pipeline before adding explanation quality as another variable.

## Decisions

Use a Node-only repository package called by the CLI. Read committed HEAD through Git plumbing with explicit argument arrays, disabled external diff/text conversion, no checkout, and no repository code execution. Never use shell-expanded command strings. Audit Git configuration and environment interactions before considering this boundary safe.

Start with tracked-file metadata, README/Markdown documentation, and recent commit metadata. Do not infer architecture or intent in this change. Inventory source paths for future analysis, but avoid copying every source blob into the snapshot.

Write a schema-versioned manifest plus documentation extracts to an ignored local output directory, atomically. Require an output directory outside the target checkout to avoid modifying the analyzed repository. Use stable content identities independent of absolute path and timestamp; keep run metadata separate from reproducible content.

## Resource and trust boundaries

Proposed defaults to review before implementation: 10,000 inventory entries, 512 KiB per extracted text file, 20 MiB total extracted content, 200 commits, and a 60-second run timeout. All limits must be enforced while reading, not after buffering an unbounded result. A bounded result reports truncation and coverage rather than appearing complete.

Skip binary blobs, symlinks, submodule contents, credential-like filenames, and generated/vendor directories. An exclusion configuration can narrow inclusion; it must not silently opt sensitive content back in. Tracked files can still contain secrets, so local output must not be described as sanitized for provider use.

Use a selected committed revision. Report dirty/untracked worktree state as excluded without including that content. An unborn repository gets a clear no-commits error. Shallow clones and missing objects must be distinguished from empty history. Filenames with unusual bytes or control characters require a documented encoding and safe display policy.

## Errors and cancellation

Invalid paths, missing Git, unavailable revisions, and output permission failures produce nonzero CLI results with actionable messages. Cancellation kills the active child process and removes temporary output. Existing completed snapshots must not be overwritten on a failed run. No network retry or remote fetch occurs.

## Verification

Create tiny Git fixtures with documentation, an edited tracked file, ignored and untracked files, binary content, a symlink outside the repository, a submodule entry, large text, and multiple commits. Test paths containing spaces and option-like names. Assert that the target repository and hooks remain untouched, no network requests occur, and repeated analysis of the same revision yields identical content identities.

## Open implementation decisions

Before applying, review the proposed limits and exclusion patterns and choose the snapshot runtime validator. TypeScript interfaces alone do not validate serialized data. These choices are intentionally not implemented by the bootstrap.
