# GitHub setup

The repository is [codestuffio/software-journey](https://github.com/codestuffio/software-journey). It uses `main` as its default branch and the project source is licensed under [MIT](../LICENSE).

For a new checkout, use the existing repository:

```sh
git clone https://github.com/codestuffio/software-journey.git
```

Sign into GitHub using your preferred credential manager if the repository requires authentication. Review branch protection and private vulnerability reporting in the repository settings.

The [CI workflow](../.github/workflows/ci.yml) runs `pnpm verify` on pull requests and pushes to `main`. Check its results in [GitHub Actions](https://github.com/codestuffio/software-journey/actions/workflows/ci.yml).
