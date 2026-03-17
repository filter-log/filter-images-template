import { createAppAuth } from "@octokit/auth-app";

const GITHUB_API_BASE = "https://api.github.com";

export async function getGitHubToken() {
  if (process.env.GITHUB_FINE_GRAINED_TOKEN) {
    return process.env.GITHUB_FINE_GRAINED_TOKEN;
  }

  const appId = process.env.GITHUB_APP_ID;
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!appId || !installationId || !privateKey) {
    throw new Error("GitHub authentication is not configured.");
  }

  const auth = createAppAuth({
    appId,
    privateKey,
    installationId,
  });

  const installationAuth = await auth({ type: "installation" });
  return installationAuth.token;
}

export async function githubRequest(pathname, { method = "GET", token, body } = {}) {
  const response = await fetch(`${GITHUB_API_BASE}${pathname}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "filter-upload-api",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${method} ${pathname} failed: ${response.status} ${text}`);
  }

  if (response.status === 204) {
    return {};
  }

  return response.json();
}

export async function listExistingNames({ owner, repo, branch, directory, token }) {
  const encodedDirectory = directory
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  const payload = await githubRequest(
    `/repos/${owner}/${repo}/contents/${encodedDirectory}?ref=${encodeURIComponent(branch)}`,
    { token },
  );

  if (!payload) {
    return new Set();
  }

  return new Set(payload.filter((item) => item.type === "file").map((item) => item.name.replace(/\.[^.]+$/, "")));
}

export async function putFile({ owner, repo, branch, targetPath, contentBase64, message, token }) {
  const encodedPath = targetPath
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");

  return githubRequest(`/repos/${owner}/${repo}/contents/${encodedPath}`, {
    method: "PUT",
    token,
    body: {
      message,
      content: contentBase64,
      branch,
    },
  });
}
