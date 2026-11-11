## Purpose

Let developers review the affected chapters and anticipated generation cost of a proposed walkthrough update.

## ADDED Requirements

### Requirement: Plan a walkthrough update for a pull request

The workflow SHALL plan against the proposed merge for same-repository main-to-journey pull requests. It SHALL report baseline and target revisions, chapter decisions with reasons, and estimated input tokens, output tokens, and model cost before generation. It SHALL complete without reading source excerpts or calling a provider. Any later sending of source content to a model SHALL require explicit approval.

#### Scenario: A PR modifies chapter evidence

- **WHEN** committed evidence changes for one or more chapters
- **THEN** the plan identifies those chapters for update and identifies unchanged chapters as reuse candidates
- **AND** only chapters marked for update contribute to the generation estimate

#### Scenario: A chapter is added or removed

- **WHEN** a target catalog adds or removes a chapter
- **THEN** the plan identifies the new chapter for update and the removed chapter for retirement

#### Scenario: The baseline or coverage is limited

- **WHEN** there is no baseline chapter catalog
- **THEN** the plan describes a first run and marks every target chapter for update
- **AND** the plan discloses that its coverage is limited to declared Git paths

#### Scenario: An input cannot be verified

- **WHEN** the target catalog is invalid, exceeds its limit, or a requested commit is unavailable
- **THEN** the command fails without reporting an unverified reuse decision
