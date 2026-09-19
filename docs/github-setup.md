# GitHub setup

The owner will create `codestuffio/software-journey` manually. Choose visibility and create an empty repository without a generated README, license, or gitignore, since the local scaffold already supplies the repository files.

After reviewing and committing the local files, connect the remote:

```sh
git remote add origin https://github.com/codestuffio/software-journey.git
git branch -M main
git push -u origin main
```

If `origin` already exists, inspect it before changing it. Sign into GitHub using your preferred credential manager. Enable branch protection and private vulnerability reporting as appropriate after the first push. Choose a distribution license before making the project public.

CI is configured for pull requests and pushes to `main`; it has not run on GitHub until the repository is created and pushed.
