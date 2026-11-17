## Design

The workflow grants OIDC only to a manually dispatched job on the default branch. For generation, the CLI compares the approval digest before reading OIDC settings or requesting a token. An explicit identity check exchanges a token without preparing chapters or calling Messages. Preview and publication jobs lack OIDC permission.

The CLI requests GitHub's JWT for the Anthropic audience, exchanges it at the fixed Anthropic OAuth endpoint, and uses the returned bearer token for approved Messages requests. Keep credentials in process memory and refresh short-lived tokens if needed. Use bounded response reads, timeouts, HTTPS, no redirects, and diagnostics without token or response body data. Store rule, organization, service-account, and workspace IDs as repository variables.
