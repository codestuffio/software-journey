# Assisted explanation acceptance

R7 was validated on 2026-09-24 using synthetic evidence and a simulated provider transport. No repository source was uploaded, no live API request was made, and no model charges were incurred during implementation.

`pnpm verify` passed with 55 unit/integration tests, two CLI/HTTP smoke tests, and all eight strict OpenSpec validations. `pnpm test:e2e` passed all nine browser tests.

The provider tests cover deterministic offline previews, no credential lookup before approval, changed source and budget invalidating approval, preflight cost rejection, unavailable evidence, missing credentials, the exact approved body, fixed destination, redirect refusal, usage reporting, invented citations, nonmatching quotes, refusal/incomplete output, HTTP failures, malformed and oversized responses, cancellation before dispatch, and cancellation during response reading. Each dispatched failure is checked for no automatic retry and explicit unknown-usage messaging.

The compiled CLI was exercised with a simulated provider as well as with network/process APIs blocked. Browser tests cover local matching-report import, inert model text, invalid-report clearing, restart clearing, and a slow report selection superseded by a newer selection. Unit tests also reject oversized reports, artifact mismatches, and altered source excerpts.

The README preview command was run offline against the pinned OpenSpec artifacts and a 20-line implementation selection. It selected one excerpt with a 1,000-token output cap and a conservative estimated maximum of $0.0057304 at the pinned rates. Its exact payload remains in ignored `.software-journey/explanation-preview.json`.

Live model availability, account-specific billing, and semantic explanation quality are unmeasured. The structured-output and citation checks validate attribution and quoting, not the truth of generated inferences. The first live run requires a user-reviewed source preview, its matching approval digest, and a locally configured API credential.

Official API and pricing references are recorded in [the provider package documentation](../../packages/explanations/README.md). Reproduce synthetic validation with `pnpm verify` and `pnpm test:e2e`; follow the README for the separate, explicit live approval flow.
