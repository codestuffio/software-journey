# Proposal

## Why

The completed milestones establish evidence availability and bounded retrieval, but do not establish whether developers or agents answer repository questions correctly. The next stretch should make answer quality and resource comparisons reviewable before expanding repositories, infrastructure, or generated lessons.

## What Changes

- Add a local, manually reviewed answer-evaluation protocol with explicit correctness, citation, and uncertainty criteria.
- Preserve the existing five-case citation evaluator. Add a separate versioned answer benchmark, including a before/after behavior-change question when sufficient historical evidence is available.
- Record paired direct-exploration and retrieval trials with matching questions, repository revisions, participant/model settings, and budgets. Distinguish synthetic harness validation from real trials.
- Report measured bytes, elapsed time, and tool calls; tokens and account costs remain unknown unless supplied with provenance.
- Prepare offline reference answers and trial artifacts. Model execution is separate and requires explicit approval before selected source leaves the machine.

**Observable outcome:** a user can inspect a local comparison report and see which answers met the reviewed rubric, what evidence was missing, and whether measured resource differences preserved quality.

**Non-goals:** automatic semantic grading, a new provider runner, live source uploads, MCP transport, generalized workflow discovery, scaling infrastructure, and claims of savings from synthetic trials.

## Capabilities

### New Capabilities

- `answer-evaluation`: Revision-pinned reference rubrics, local trial records, human assessments, and qualified paired comparisons.

### Modified Capabilities

None. Existing citation evaluation, retrieval, and approved explanations retain their contracts.

## Impact

Add shared contracts, pure report assembly in `packages/knowledge`, explicit local file loading in `packages/repository`, and a CLI report command. Add focused fixtures and acceptance documentation. Raw answers, reference extracts, and trial reports remain ignored local artifacts. No new runtime service or dependency is planned.
