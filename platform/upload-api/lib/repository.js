export function resolveTargetRepository() {
  return (
    process.env.TARGET_REPO ||
    process.env.GITHUB_REPOSITORY?.split("/")[1] ||
    process.env.PUBLIC_REPOSITORY_NAME ||
    ""
  );
}

export function resolveRepositoryOwner() {
  return process.env.GITHUB_OWNER || process.env.GITHUB_REPOSITORY?.split("/")[0] || "";
}
