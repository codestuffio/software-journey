## Why

Allow the release job to call Claude as an Anthropic service account with a short-lived credential.

## What Changes

Use GitHub OIDC and Anthropic Workload Identity Federation for approved release generation. Add a manual identity check that sends no chapter content.

## Capabilities

### Modified Capabilities

- `release-walkthrough`: Authenticate approved GitHub generation with Workload Identity Federation.

## Impact

Changes the release workflow and CLI authentication. Local key-based commands remain available.
