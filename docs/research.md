# Reference projects and tooling

Checked 2026-09-18. These are inputs to the design, not dependencies to copy wholesale.

| Reference | Use here |
| --- | --- |
| [OpenSpec](https://github.com/Fission-AI/OpenSpec) | Development workflow and selected first demonstrator; inspect its live specs, changes, source, tests, and history at a pinned revision |
| [GitHub Spec Kit](https://github.com/github/spec-kit) | Later comparison dataset with a different spec-driven workflow |
| [TanStack Start setup](https://tanstack.com/start/latest/docs/framework/react/build-from-scratch) | React/Router/Vite foundation; Start plugin precedes the React plugin |
| [TanStack Start hosting](https://tanstack.com/start/latest/docs/framework/react/guide/hosting) | Node production build via Nitro |
| [Turborepo repository structure](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository) | Separate applications from shared packages and declare workspace dependencies |

OpenSpec is useful as an evaluation target because its intended behavior is represented alongside implementation. This does not establish that its specs, docs, and code always agree; detecting and explaining disagreements is part of the proposed evaluation.

The user selected TanStack Start explicitly. Next.js is prohibited. The original request for Turbopack has been reconciled with that choice by using Vite as the bundler and Turborepo as the monorepo task runner.
