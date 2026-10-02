# Tasks

Implementation is pending explicit owner approval. This proposal does not mark any capability delivered.

## 1. Contracts and compatibility

- [ ] 1.1 Add bounded selection and source-capture schemas in `packages/contracts`, with digest/range/binding validation; verify fixtures reject invalid selectors, duplicate selections, forged digests, mismatched snapshots, and inconsistent text spans.
- [ ] 1.2 Extend local evidence and response contracts for optional source captures and define evidence-manifest version 2; verify legacy snapshot/bundle/manifests remain accepted and old retrieval responses retain identical bytes without sidecars.

## 2. Committed collection

- [ ] 2.1 Add the Node-only collector using pinned tree entries and the existing hardened Git runner; verify synthetic repository fixtures capture exact committed ranges, ignore dirty content, survive HEAD movement, and report missing objects without fetching.
- [ ] 2.2 Preserve exclusions and reject unsupported entries before reading blobs; verify symlinks, submodules, credential-like/generated paths, binary data, invalid UTF-8, hostile path names, and executable-looking text cannot cause execution or source transfer.
- [ ] 2.3 Enforce read/text/serialized limits, stable selection order, byte accounting, and complete-line capture; verify duplicate-blob accounting, CRLF, Unicode, final unterminated lines, beyond-EOF ranges, oversized lines/blobs, and total-budget exhaustion produce correct citations and coverage.
- [ ] 2.4 Add the 30-second overall deadline, cancellation, and atomic exclusive publication; verify children terminate and failures/concurrent writers cannot publish partial artifacts or overwrite output, including output reached through a symlink into any checkout.
- [ ] 2.5 Expose `capture-sources` in `apps/cli` with bounded regular request/snapshot inputs; verify compiled CLI success, invalid/missing/duplicate flags, identity errors, and cancellation exit behavior through subprocess tests.

## 3. Artifact-only consumers

- [ ] 3.1 Load optional sidecars through `packages/repository/src/artifacts.ts` and expose them in deterministic knowledge discovery/retrieval; verify digest/binding failures are rejected, partial/unavailable selections retain reasons, captures from different origins stay separate, and the full response remains within its declared UTF-8 byte budget.
- [ ] 3.2 Add optional `--sources` to `context` and `retrieve`; verify both compiled commands work from artifacts after the original checkout is unavailable, without Git, network calls, or captured instruction execution.
- [ ] 3.3 Add version 2 manifest loading and source identities to answer report provenance; verify missing or truncated historical ranges remain unavailable, complete ranges resolve, and mismatched/digest-invalid/oversized inputs fail under the existing combined limit and reporting deadline.
- [ ] 3.4 Preserve review and resource rules; verify newly available citations do not make unreviewed, synthetic, failed-quality, mismatched, or unmatched trials eligible for savings and do not populate unknown token/cost measurements.

## 4. Pinned acceptance and handoff

- [ ] 4.1 Capture `src/utils/task-progress.ts:26-51` at `62106f40e3b7b7364529a2f928717e23e37282eb`, plus `src/utils/task-progress.ts:55-80` and `test/utils/task-progress.test.ts:359-382` at `11a9691524bad84a575854bf6dc5124f630479ba`, using isolated local checkouts and ignored/external output; verify all five benchmark cases have available citations from artifacts alone and never execute imported tests.
- [ ] 4.2 Update the collection/retrieval instructions, trial preparation helper, and acceptance document only after the pinned run; verify examples reproduce full historical citation coverage while absent sidecars still reproduce unavailable findings and semantic quality remains explicitly unmeasured.
- [ ] 4.3 Run focused source-capture/retrieval/answer-evaluation tests and required `pnpm verify`; inspect the diff for private artifacts and record results and limitations before proposing archive or release steps.
