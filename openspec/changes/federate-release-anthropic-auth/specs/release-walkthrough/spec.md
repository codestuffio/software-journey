## ADDED Requirements

### Requirement: Federate GitHub release credentials

Approved GitHub release generation SHALL use a short-lived Anthropic access token exchanged from a GitHub OIDC JWT. Preview and publication jobs SHALL have no OIDC permission. Release generation SHALL request credentials only after verifying the exact request approval and only if a chapter needs generation. Credentials SHALL remain in the job process and SHALL be excluded from previews, logs, and published assets.

#### Scenario: Approved chapter generation

- **WHEN** a default-branch maintainer dispatch provides a matching approval and chapters need generation
- **THEN** the job exchanges its OIDC token and sends only the approved excerpts using the resulting bearer token

#### Scenario: Identity check without generation

- **WHEN** a maintainer manually runs the identity check
- **THEN** the workflow verifies the token exchange without reading or sending chapter excerpts or publishing an asset

#### Scenario: Preview, stale approval, or missing credentials

- **WHEN** approval is absent or stale, or all chapters can be reused
- **THEN** the workflow makes no credential exchange for generation
- **AND** a missing federation setting, exchange failure, or oversized exchange response for an approved generation fails before any chapter is sent
