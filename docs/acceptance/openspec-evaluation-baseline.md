# OpenSpec evaluation baseline

The local evaluator checks five fixed, source-cited OpenSpec onboarding questions at `bae58cf61479986431bb798acbe5a688a591c18c`. It evaluates recorded citations rather than model-generated answers.

```sh
node apps/cli/dist/index.js evaluate \
  --repository /Users/adam/Documents/GitHub/OpenSpec \
  --snapshot .software-journey/poc/openspec/snapshot.json \
  --bundle .software-journey/poc/openspec/workflow/workflow.json \
  --output .software-journey/poc/openspec/evaluation
```

The generated ignored report recorded 5/5 resolved citations. Its cases cover command entry, implementation, governing specification, validating test, and the pinned revision. It contains no source upload, code execution, or model call.

Verification on 2026-09-22:

- `pnpm verify` passed.
- `pnpm test:e2e` passed.
- `pnpm spec:validate` passed with strict OpenSpec validation.
