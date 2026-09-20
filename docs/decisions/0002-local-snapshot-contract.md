# 0002: Conservative local snapshot contract

Date: 2026-09-20

## Decision

The first local analyzer reads committed `HEAD` only. It does not accept a revision selector, resolve an alternate ref, read index or working-tree content, fetch, or modify the checkout. Dirty and untracked state is measured with Git's stable NUL-delimited porcelain output and reported as excluded coverage.

Use Zod 4 as a direct dependency of `@software-journey/contracts`. Zod schemas are the persisted snapshot source of truth; TypeScript types are inferred from them, and the complete output is validated before its temporary directory is atomically exposed.

V1 limits are fixed at 10,000 inventory entries, 512 KiB per documentation text file, 20 MiB of extracted documentation text in total, 200 commits, and 60 seconds for the entire run. Limits are enforced while reading. A reached limit becomes a coverage or omission record rather than an apparently complete result.

The built-in exclusion policy omits binary blobs, symlinks, submodule contents, and paths whose case-insensitive segments identify common generated or vendor locations (`node_modules`, `vendor`, `dist`, `build`, `coverage`, `.next`, `.turbo`, `target`, `out`, or `generated`). It also omits credential-like names: `.env` and `.env.*`, `.npmrc`, `id_rsa`, `id_ed25519`, names containing `credential` or `secret`, and files ending in `.pem` or `.key`. Future configuration may narrow normal inclusion, but cannot re-include these safety exclusions in v1.

Git filenames are read as raw NUL-delimited bytes. A path is emitted only when it decodes as strict UTF-8, round-trips to the same bytes, contains no NUL or Unicode control character, and can be represented with `/` separators. Unsupported byte sequences are omitted with `invalid-path-encoding`; otherwise unsafe control characters are omitted with `unsafe-path-character`.

## Reason

Committed `HEAD` makes the initial evidence model stable, traceable, and unambiguous while avoiding accidental inclusion of a developer's in-progress work. A runtime validator prevents a TypeScript-only contract from accepting malformed persisted JSON. Fixed, conservative limits and exclusions make behavior testable before real repositories introduce scale or sensitive-data edge cases. NUL-delimited Git output avoids Git's quoted-path ambiguity, while refusing unsafe display names keeps the first explorer contract safe to render.

## Consequences

Task 1.2 adds Zod directly rather than relying on a transitive installation. Fixture tests must exercise each boundary and omission reason. Consumers must show coverage and omissions as first-class data, and must not call an output sanitized or safe to upload. Supporting an explicit revision, broader filename encodings, or configurable safety exclusions requires a later change with a migration and UX decision.
