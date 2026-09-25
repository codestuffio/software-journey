## Why

Readers can now inspect a guided lesson but cannot request a deeper explanation with an explicit source-sharing decision. R7 adds a narrow optional provider flow that previews the exact selected text and costs before any upload.

## What Changes

- Add an artifact-only CLI explanation preview using an existing retrieval request, with exact outbound content, model, destination, limits, and a payload-bound approval digest.
- Send one approved request to OpenAI and produce a local versioned explanation report with inference/quote/unknown labels, validated citation references, provenance, usage, and cost estimates.
- Let readers open a matching report beside the authored lesson without sending anything from the browser.
- Verify consent, cancellation, budgets, refusal, malformed output, and citation validation using a simulated provider. Live provider availability and semantic quality are explicitly unmeasured.

Non-goals: automatic source upload, automatic retry, provider abstraction, accounts, agents or tools, generated facts presented as verified, live model benchmarking, or hosted ingestion.

## Capabilities

### New Capabilities

- `assisted-explanations`: Preview, approve, request, and inspect a bounded explanation of explicitly selected evidence.

### Modified Capabilities

None. The existing offline commands and authored lesson remain usable without credentials.

## Impact

A private Node-only explanations package owns the single provider request; repository and knowledge packages retain their existing boundaries. Contracts define report validation. CLI help and browser report selection gain additive behavior. OPENAI_API_KEY is read only during approved execution and never enters browser bundles or reports.
