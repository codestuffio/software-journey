# Design

## Context

The workspace is a scaffold. There is no repository reader or persisted snapshot format yet. See `proposal.md` for motivation and `docs/roadmap.md` R1 for the milestone boundary. Build a deterministic evidence pipeline before adding explanation quality as another variable.

## Goals / Non-Goals

**Goals:**

- Produce a local, versioned evidence snapshot that later web and agent surfaces can consume without re-reading the target repository.
- Make every included fact traceable to a committed revision and path, while making omissions and limits visible.
- Establish safe, bounded process and filesystem behavior that remains valid as the product grows.

**Non-Goals:**

- Define repository architecture, execute source code, or infer author intent.
- Add a browser explorer, hosted storage, background service, semantic index, or provider integration.
- Treat the local output as scrubbed or safe to send to another system.

## Decisions

Use a Node-only repository package called by the CLI. Read committed HEAD through Git plumbing with explicit argument arrays, disabled external diff/text conversion, no checkout, and no repository code execution. Never use shell-expanded command strings. Audit Git configuration and environment interactions before considering this boundary safe.

Start with tracked-file metadata, README/Markdown documentation, and recent commit metadata. Do not infer architecture or intent in this change. Inventory source paths for future analysis, but avoid copying every source blob into the snapshot.

Write a schema-versioned manifest plus documentation extracts to an ignored local output directory, atomically. Require an output directory outside the target checkout to avoid modifying the analyzed repository. Use stable content identities independent of absolute path and timestamp; keep run metadata separate from reproducible content.

Use Zod 4 as a direct dependency of the contracts package. Zod schemas are the persisted snapshot source of truth, TypeScript types are inferred from them, and the full output is validated before a temporary output directory is atomically exposed.

## Resource and trust boundaries

V1 limits are 10,000 inventory entries, 512 KiB per extracted documentation text file, 20 MiB total extracted documentation text, 200 commits, and a 60-second run timeout. All limits must be enforced while reading, not after buffering an unbounded result. A bounded result reports truncation and coverage rather than appearing complete.

Skip binary blobs, symlinks, submodule contents, and paths whose case-insensitive segments identify `node_modules`, `vendor`, `dist`, `build`, `coverage`, `.next`, `.turbo`, `target`, `out`, or `generated`. Also skip credential-like names: `.env` and `.env.*`, `.npmrc`, `id_rsa`, `id_ed25519`, names containing `credential` or `secret`, and files ending in `.pem` or `.key`. An exclusion configuration can narrow normal inclusion; it must not silently opt these safety exclusions back in. Tracked files can still contain secrets, so local output must not be described as sanitized for provider use.

Use committed `HEAD` only in v1; the CLI accepts a checkout path, not a revision selector or alternate ref. Report dirty/untracked worktree state as excluded without including that content. An unborn repository gets a clear no-commits error. Shallow clones and missing objects must be distinguished from empty history. Read Git path output as raw NUL-delimited bytes; emit a path only when it strictly decodes and round-trips as UTF-8, has no NUL or Unicode control character, and can use `/` separators. Omit invalid byte sequences as `invalid-path-encoding` and unsafe control characters as `unsafe-path-character`.

The snapshot contract is the seam between this change and future explorer and retrieval work. Version the schema from its first output, validate it at the write boundary, and preserve the following distinct data classes: observed repository facts, quoted documentation extracts, derived coverage and omission records, and run metadata. Do not introduce an explanation or inference field in this format.

## Errors and cancellation

Invalid paths, missing Git, unavailable revisions, and output permission failures produce nonzero CLI results with actionable messages. Cancellation kills the active child process and removes temporary output. Existing completed snapshots must not be overwritten on a failed run. No network retry or remote fetch occurs.

## Risks / Trade-offs

- **Large or adversarial repositories can exhaust process resources** → enforce limits while streaming data, stop on the first breached global limit, and report the resulting coverage.
- **Git configuration and repository content can trigger external behavior** → use fixed Git argument arrays, disable external diff and text conversion paths, and never execute repository-provided commands or hooks.
- **A snapshot can be mistaken for complete or safe-to-share** → model omissions, truncation, dirty state, and history completeness explicitly; document that local extraction is not sanitization.
- **Early schema choices can block later consumers** → preserve stable identities and versioned format metadata, while keeping v1 limited to facts and quoted extracts.
- **Manual acceptance can drift from automated guarantees** → use synthetic fixture tests for contract behavior and a separately recorded pinned OpenSpec demonstration for human citation checks.

## Migration Plan

1. Add the repository package, contracts, CLI command, and synthetic fixtures behind the new local-analysis command.
2. Write each snapshot to a fresh temporary location and atomically expose it only after validation completes.
3. Keep the existing help-only CLI behavior for unsupported commands until the new command is verified.
4. If a run fails or is canceled, remove only its temporary output and leave existing completed snapshots untouched.

No deployment or persisted-data migration applies in this local-first change. Later schema versions must identify their format version and provide an explicit compatibility or migration story in their own change.

## Verification

Create tiny Git fixtures with documentation, an edited tracked file, ignored and untracked files, binary content, a symlink outside the repository, a submodule entry, large text, and multiple commits. Test paths containing spaces and option-like names. Assert that the target repository and hooks remain untouched, no network requests occur, and repeated analysis of the same revision yields identical content identities.
