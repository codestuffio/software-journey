## ADDED Requirements

### Requirement: Local committed snapshot
The analyzer SHALL read an explicitly selected local Git checkout at committed HEAD and SHALL NOT modify or execute the target repository.

#### Scenario: A valid checkout is analyzed
- **WHEN** a user requests analysis of a local checkout with at least one commit
- **THEN** the analyzer identifies HEAD and produces evidence referring to that commit without changing target files or Git state

#### Scenario: An uncommitted change exists
- **WHEN** the checkout contains uncommitted or untracked content
- **THEN** the analyzer reports that content is excluded and reads only the committed snapshot

#### Scenario: Input is not a usable repository
- **WHEN** the path is invalid, Git is unavailable, or no commit exists
- **THEN** the CLI exits unsuccessfully with a specific error and produces no completed snapshot

### Requirement: Bounded evidence collection
The analyzer SHALL enforce file-count, per-file byte, total-byte, history-count, and runtime limits and SHALL report coverage and omissions.

#### Scenario: A limit is reached
- **WHEN** an inventory or extraction limit is reached
- **THEN** the result names the applicable limit and affected coverage without claiming complete analysis

#### Scenario: Unsafe or unsupported files are encountered
- **WHEN** an entry is a symlink, binary, submodule, credential-like path, or excluded generated/vendor content
- **THEN** its content is not extracted and the omission reason is recorded without following it outside the repository

#### Scenario: A tracked path cannot be safely represented
- **WHEN** Git reports a path whose bytes are not strict UTF-8 or whose decoded name contains a Unicode control character
- **THEN** the analyzer omits it with `invalid-path-encoding` or `unsafe-path-character` and continues without interpreting the path as a command or display string

### Requirement: Traceable documentation and history
The analyzer SHALL attach revision/path references to documentation and SHALL distinguish complete from unavailable or truncated history.

#### Scenario: A reader resolves an extracted passage
- **WHEN** a reader opens the passage's referenced file at the recorded commit and line range
- **THEN** the referenced source matches the passage

#### Scenario: History is shallow
- **WHEN** the checkout has a shallow history boundary
- **THEN** the snapshot explicitly identifies incomplete history and performs no network fetch

### Requirement: Local deterministic output
The analyzer SHALL write a schema-versioned snapshot outside the target checkout with stable content identities and SHALL NOT send source content over a network.

#### Scenario: Analysis is repeated
- **WHEN** the same commit and analysis settings are used twice
- **THEN** evidence content identities match even if run timestamps or absolute checkout paths differ

#### Scenario: Analysis fails or is canceled
- **WHEN** a run times out, is canceled, or cannot finish writing
- **THEN** child processes terminate and incomplete output is not visible as a completed snapshot

#### Scenario: Repository text contains instructions
- **WHEN** a file directs the analyzer to run commands or upload contents
- **THEN** the text is treated only as source data and those instructions are not followed
