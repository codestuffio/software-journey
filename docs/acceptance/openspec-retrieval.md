# OpenSpec retrieval acceptance

This exercise uses the existing local snapshot and workflow bundle for OpenSpec revision `bae58cf61479986431bb798acbe5a688a591c18c`. It checks captured-evidence equality, citations, response byte limits, pagination, and unavailable evidence. It does not grade answers or measure token savings.

## Reproduce

```sh
pnpm build
node tests/acceptance/retrieval.mjs \
  --snapshot .software-journey/poc/openspec/snapshot.json \
  --bundle .software-journey/poc/openspec/workflow/workflow.json \
  --output .software-journey/poc/openspec/retrieval/acceptance.json
```

The script validates artifact identities against the checked-in five-question evaluation catalog, retrieves each category by workflow step, and compares returned text and references or history metadata with the captured artifact. It also performs a 4 KiB retrieval, requests missing evidence, and traverses the discovery manifest at a 4 KiB page budget. Each response's measured UTF-8 size must match its reported byte count and remain within budget.

## Observed outcomes

On 2026-09-24, all five category comparisons passed. All source excerpts matched the selected workflow captures exactly; the history case returned the recorded commit metadata without a fabricated file citation.

| Case | Response bytes | Budget bytes |
| --- | ---: | ---: |
| Command entry | 32,627 | 262,144 |
| Implementation | 7,487 | 262,144 |
| Governing specification | 4,219 | 262,144 |
| Validating test | 25,167 | 262,144 |
| Selected revision | 1,262 | 262,144 |
| Reduced-budget command entry | 4,039 | 4,096 |
| Missing evidence | 932 | 4,096 |

The five full captures retain `partial` response status because the input snapshot records limited history. The reduced-budget trial reports omitted lines and returns a prefix ending at a complete line. Missing evidence is `unavailable`. Discovery visited 710 descriptors in 178 pages without skipping or repeating them. The ignored report records local elapsed times; these timings are observations rather than performance gates.

The report and third-party captures remain under ignored `.software-journey/`. Synthetic tests additionally cover identity mismatch, inconsistent line spans, absent checkouts, unknown or uncaptured paths, null and partial ranges, Unicode, oversized lines, cancellation, growing files, and invalid CLI arguments. The CLI integration fixture blocks process creation and network APIs while retrieving instruction-like source text as inert data.

Verification on 2026-09-24: `pnpm verify` passed with 42 Vitest tests, two CLI/HTTP smoke tests, workspace lint/typecheck/build checks, and all six strict OpenSpec validations. The README context and ranged-retrieval commands were also run against the pinned artifacts.
