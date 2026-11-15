#!/usr/bin/env bash
set -euo pipefail

cli=apps/cli/dist/index.js
asset=software-journey.md
tag=$(jq -nr --arg tag "$JOURNEY_RELEASE_TAG" '$tag | @uri')
release=$(gh api "repos/$GITHUB_REPOSITORY/releases/tags/$tag")
test "$(jq -r '.draft' <<< "$release")" = false
export JOURNEY_RELEASE_ID
JOURNEY_RELEASE_ID=$(jq -r '.id' <<< "$release")
export JOURNEY_PRERELEASE
JOURNEY_PRERELEASE=$(jq -r '.prerelease' <<< "$release")
eligible=$(node "$cli" release-walkthrough eligible)
if [[ $eligible != yes ]]; then
  if [[ -n ${JOURNEY_APPROVAL:-} ]]; then
    echo "This release no longer qualifies." >&2
    exit 1
  fi
  echo "This release is outside the walkthrough version policy." >> "$GITHUB_STEP_SUMMARY"
  exit 0
fi
if jq -e --arg name "$asset" '.assets | any(.name == $name)' <<< "$release" >/dev/null; then
  echo "This release already has a walkthrough." >> "$GITHUB_STEP_SUMMARY"
  exit 0
fi
if [[ $(jq -r '.immutable == true' <<< "$release") == true ]]; then
  echo "This published release is immutable. GitHub cannot attach another asset." >&2
  exit 1
fi

export JOURNEY_RELEASE_SHA
JOURNEY_RELEASE_SHA=$(git rev-parse --verify --end-of-options "refs/tags/$JOURNEY_RELEASE_TAG^{commit}")
if [[ ${GITHUB_EVENT_NAME:-} == release && $JOURNEY_RELEASE_SHA != "$GITHUB_SHA" ]]; then
  echo "The release tag no longer matches the triggering commit." >&2
  exit 1
fi
export JOURNEY_OUTPUT="$RUNNER_TEMP/journey-release"
mkdir "$JOURNEY_OUTPUT"

# Examine at most 100 published releases. A baseline must be an earlier
# release in GitHub publication order and an ancestor of the selected commit.
releases=$(gh api "repos/$GITHUB_REPOSITORY/releases?per_page=100")
published_at=$(jq -r .published_at <<< "$release")
previous_releases=$(jq -r --arg name "$asset" --arg time "$published_at" '
  map(select(.draft == false and .published_at < $time and any(.assets[]; .name == $name)))
  | sort_by(.published_at) | reverse
  | .[] | [.tag_name, (.assets[] | select(.name == $name) | .size)] | @tsv' <<< "$releases")
while IFS=$'\t' read -r previous asset_size; do
  [[ -n $previous ]] || continue
  prior_sha=$(git rev-parse --verify --quiet "refs/tags/$previous^{commit}") || continue
  if git merge-base --is-ancestor "$prior_sha" "$JOURNEY_RELEASE_SHA"; then
    if [[ ! $asset_size =~ ^[0-9]+$ ]] || (( asset_size > 2 * 1024 * 1024 )); then
      echo "The previous walkthrough asset exceeds its 2 MiB limit." >&2
      exit 1
    fi
    export JOURNEY_PUBLICATION_SHA="$prior_sha"
    export JOURNEY_PUBLICATION_ASSET="$JOURNEY_OUTPUT/baseline.md"
    gh release download --repo "$GITHUB_REPOSITORY" --pattern "$asset" --output "$JOURNEY_PUBLICATION_ASSET" -- "$previous"
    break
  fi
done <<< "$previous_releases"

if [[ -z ${JOURNEY_PUBLICATION_SHA:-} && -n ${JOURNEY_SEED_RELEASE:-} ]]; then
  seed_tag=$(jq -nr --arg tag "$JOURNEY_SEED_RELEASE" '$tag | @uri')
  seed=$(gh api "repos/$GITHUB_REPOSITORY/releases/tags/$seed_tag")
  test "$(jq -r '.draft' <<< "$seed")" = false
  export JOURNEY_PUBLICATION_SHA
  JOURNEY_PUBLICATION_SHA=$(git rev-parse --verify --end-of-options "refs/tags/$JOURNEY_SEED_RELEASE^{commit}")
  git merge-base --is-ancestor "$JOURNEY_PUBLICATION_SHA" "$JOURNEY_RELEASE_SHA"
  export JOURNEY_PUBLICATION_SEED="$JOURNEY_OUTPUT/seed.md"
  jq -r .body <<< "$seed" > "$JOURNEY_PUBLICATION_SEED"
fi

node "$cli" release-walkthrough | tee -a "$GITHUB_STEP_SUMMARY"
if [[ -f "$JOURNEY_OUTPUT/$asset" ]]; then
  printf '%s\n' "ready=yes" "revision=$JOURNEY_RELEASE_SHA" "release-id=$JOURNEY_RELEASE_ID" >> "$GITHUB_OUTPUT"
elif [[ -f "$JOURNEY_OUTPUT/approval.json" ]]; then
  echo "preview=yes" >> "$GITHUB_OUTPUT"
  printf '\nDownload the approval artifact, review the selected excerpts, and run this workflow from the default branch with the same release tag and approval digest.\n' >> "$GITHUB_STEP_SUMMARY"
fi
