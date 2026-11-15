const identifier = "(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)";
const semver = new RegExp(
  `^v?((0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(-${identifier}(?:\\.${identifier})*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?)$`,
);

export function releaseVersion(tag: string) {
  const match = tag.length <= 128 ? semver.exec(tag) : null;
  if (!match?.[1] || match[0] !== tag) return null;
  return {
    version: match[1],
    kind: match[5]
      ? "prerelease"
      : match[4] !== "0"
        ? "patch"
        : match[3] !== "0"
          ? "minor"
          : "major",
  };
}

export function releaseEligible(
  tag: string,
  prerelease: boolean,
  settings: {
    types?: string | undefined;
    include?: string | undefined;
    exclude?: string | undefined;
  },
) {
  const items = (value: string) => value.split(/[\s,]+/u).filter(Boolean);
  const configured = settings.types ?? "major";
  const types = configured === "none" ? [] : items(configured);
  if (
    types.some(
      (type) => !["major", "minor", "patch", "prerelease"].includes(type),
    )
  )
    throw new Error(
      "JOURNEY_RELEASE_TYPES must list major, minor, patch, or prerelease, or be none.",
    );
  const versions = (value: string) =>
    items(value).map((item) => {
      const parsed = releaseVersion(item);
      if (!parsed)
        throw new Error(
          "Release includes and excludes must be exact SemVer versions.",
        );
      return parsed.version;
    });
  const included = versions(settings.include ?? "");
  const excluded = versions(settings.exclude ?? "");
  const candidate = releaseVersion(tag);
  return (
    !!candidate &&
    !excluded.includes(candidate.version) &&
    (included.includes(candidate.version) ||
      types.includes(prerelease ? "prerelease" : candidate.kind))
  );
}
