# Contributing

Use the setup in `README.md`. Keep each change focused on a capability with observable acceptance scenarios.

1. Explore the problem and update the product questions if a decision is missing.
2. Create an OpenSpec change with a proposal, delta specs, design, and tasks.
3. Review scope and acceptance scenarios before implementing behavior.
4. Implement the smallest working slice and add tests for its actual failure modes.
5. Run `pnpm verify` and inspect UI changes at desktop and mobile sizes.
6. Archive completed changes through OpenSpec so delivered specs match the application.

Use conventional commit messages such as `feat(repository): inventory a local checkout`. Describe behavior and validation in pull requests. Never include imported private repositories, raw analysis artifacts, or credentials in an issue, test fixture, screenshot, or commit.

For deterministic examples, use small synthetic fixtures. Real-repository evaluations must record an exact commit and respect the source license. Do not add external source trees to this repository.
