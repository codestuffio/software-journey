# Release walkthrough

## Purpose

Keep release-specific walkthroughs current through selective updates and explicit approval.

## Requirements

### Requirement: Select releases for walkthroughs

The workflow SHALL select published SemVer releases by configurable version class and exact version. Stable major releases SHALL qualify by default. Exact exclusions SHALL override inclusions.

#### Scenario: Stable major release

- **WHEN** a stable major release is published with default settings
- **THEN** the workflow prepares a walkthrough preview for its tagged commit

#### Scenario: Selected patch or skipped release

- **WHEN** a patch version is explicitly included
- **THEN** it qualifies unless explicitly excluded
- **AND** a non-SemVer tag remains outside the release workflow

### Requirement: Assemble the approved release walkthrough

The workflow SHALL reuse available chapters only when their declared Git evidence and cited lines still apply. It SHALL send only selected excerpts for chapters requiring generation, after approval of the exact outbound requests. It SHALL attach a complete walkthrough to the selected release after validating output and SHALL preserve a published asset on failure or rerun.

#### Scenario: One chapter changes

- **WHEN** a maintainer approves a preview with one changed chapter and three verified reusable chapters
- **THEN** only the changed chapter is sent for generation and the release asset includes all four chapters

#### Scenario: Approval or evidence is unavailable

- **WHEN** the digest is stale, required evidence is unavailable, or the provider returns invalid citations
- **THEN** no incomplete walkthrough is attached

#### Scenario: Evidence exceeds selection bounds

- **WHEN** a chapter has more eligible evidence than the request permits
- **THEN** the preview shows the selected excerpts and identifies the bounded coverage
