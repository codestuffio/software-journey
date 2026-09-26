# Optional assisted explanations

This private Node-only package implements one OpenAI Responses request after explicit payload-bound approval. It is never imported by the web app. Knowledge and repository packages remain offline.

`previewExplanation` builds a versioned offline preview from a validated bounded retrieval request. It includes the exact outbound body, selected text and citations, artifact identities, destination, model, prompt version, token cap, pricing basis, and estimated maximum cost. `explainEvidence` returns that preview unless approval is supplied. With approval it reconstructs and checks the digest before asking for a credential or calling the transport. The injectable fetch function exists for tests; the production CLI has no endpoint override.

The initial model is `gpt-4.1-mini-2025-04-14`. Published rates checked on 2026-09-24 are $0.40 per million input tokens and $1.60 per million output tokens. Preflight uses serialized request bytes plus 8,192 overhead tokens as a conservative input estimate. Defaults are a $0.01 ceiling and 1,000 output tokens. This policy rejects estimates above the ceiling; it is not a guarantee of an account's actual bill or future pricing. Reports estimate cost from provider-reported usage at uncached rates.

The provider call has a 30-second deadline and a 1 MiB response cap, follows no redirects, enables no tools, and never retries automatically. `store: false` disables response storage but does not promise zero provider retention. After dispatch, failure or cancellation may still incur a charge; failed calls report unknown usage without exposing provider response bodies, source, or credentials.

Returned blocks are labeled inference, quote, or unknown. Citation IDs must refer to selected evidence and quotes must match its text. These checks do not prove that an inference is true. Reports remain unverified model output.

Tests use synthetic evidence and simulated transports only. Live provider availability, pricing billed to an account, and semantic explanation quality have not been measured.

Official references:

- [Model and pricing](https://developers.openai.com/api/docs/models/gpt-4.1-mini)
- [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Responses and storage](https://developers.openai.com/api/docs/guides/migrate-to-responses)
