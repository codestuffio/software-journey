## Context

R5 selects bounded local evidence and R6 presents an authored lesson. Neither sends source externally. The provider choice and spending policy are now resolved for this first slice, without adding a model abstraction.

## Goals / Non-Goals

Provide one explicit, inspectable source-transfer operation. Preview and all browser operations remain offline. Tests use synthetic evidence and an injected simulated transport; this change makes no live availability or explanation-quality claim.

## Decisions

### CLI preview and approval

Add `explain --snapshot <file> [--bundle <file>] --request <file> [--max-cost-usd <amount>] [--max-output-tokens <count>] [--approve <digest>]`. Reuse the retrieval request format. Default to a $0.01 preflight ceiling and 1,000 output tokens; accept $0.0001–$0.10 and 128–2,000 tokens. Cap retrieval requests at 32 KiB and require at least one source excerpt, with at most eight selected captures. Reject history-only or unavailable requests.

Without approval, return a JSON preview containing the exact endpoint, request body, selected source excerpts/citations, coverage summary, model, prompt version, pricing basis, conservative input estimate, output cap, estimated maximum charge, and SHA-256 approval digest. No credential lookup or network access occurs. Hash every approval-relevant field, including limits and snapshot/bundle identities. Approved execution reconstructs the preview from current artifacts and settings; any digest mismatch fails before credential lookup or transport. Each invocation is one explicit approval, with no persistent blanket consent or automatic retry.

### Single Node-only provider boundary

Add a private explanations package rather than importing provider code into knowledge or repository. Use a single fetch call to `https://api.openai.com/v1/responses`, `redirect: error`, `store: false`, and the pinned `gpt-4.1-mini-2025-04-14` model. The API key comes from OPENAI_API_KEY only after consent validation. No model tools, background mode, URLs supplied by source text, or endpoint override are accepted. The request includes only fixed instructions and selected evidence. Untrusted source is serialized as data and the instructions forbid following embedded commands.

Use strict structured output for at most eight explanation blocks, each labeled inference, quote, or unknown with selected citation IDs. Validate returned IDs, require citations on inference and quote blocks, and require quotes to match a selected excerpt verbatim. This checks attribution structure, not semantic truth; display all provider content as unverified model output. Reports contain input identities, selected evidence, prompt/model versions, provider response ID, usage, elapsed time, pricing basis, and coverage warnings. Source citations stay immutable.

### Cost and cancellation

The initial pricing basis is $0.40 per million input tokens and $1.60 per million output tokens, checked against the official model page on 2026-09-24. Estimate input conservatively as serialized request UTF-8 bytes plus 8,192 tokens of overhead. Refuse before sending when this estimate plus the output cap exceeds the configured ceiling. Record actual reported token usage and an uncached-rate cost estimate afterward. This is a preflight estimate at published rates, not a guarantee of the account's final bill; price changes require updating the pinned basis. No cost-savings claim is made.

Use a 30-second timeout combined with user cancellation for the approved call and bounded response reading. Limit the provider response to 1 MiB. Refusals, incomplete output, HTTP failures, invalid JSON, missing usage, invalid citations, excess reported usage, and cancellation produce no successful report. Never retry automatically. After dispatch, failures state that billing may have occurred and usage is unknown; cancellation cannot guarantee reversal of a provider charge. Error messages omit provider bodies, keys, and source.

### Browser report viewing

The lesson panel accepts a local report up to 256 KiB, validates its schema and exact artifact identities, and checks selected source text/ranges against the lesson's available captures. It renders explanation blocks as plain text with labels and citations, usage, and the cost-estimate caveat. Invalid or mismatched reports clear the prior report. Replacing the lesson or restarting clears imported explanation state. No browser network operation or credential handling is added.

## Risks / Trade-offs

- Citation validity does not prove an inference. Keep model interpretation labeled and leave semantic quality unmeasured.
- Published prices or account access can change. Pin the model/rates and disclose that the cost guard is an estimate; test without credentials.
- Approval hashes can be reused deliberately. Each CLI invocation is a new explicit user action and may incur another charge; no idempotency claim is made.
- Provider retention policy is separate from response storage. `store: false` does not promise zero retention.

## Migration Plan

Add contracts, the Node provider boundary, the CLI command, and local report viewing. Validate with simulated-provider tests and browser fixtures, document live validation as unperformed, then archive. Existing local artifacts and commands remain compatible. Rollback removes only the additive provider command and report viewer.

## Sources

- https://developers.openai.com/api/docs/models/gpt-4.1-mini
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/migrate-to-responses
