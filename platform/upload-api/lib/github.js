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

export async function getBranchHead({ owner, repo, branch, token }) {
  const ref = await githubRequest(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`, {
    token,
  });
  const commit = await githubRequest(`/repos/${owner}/${repo}/git/commits/${ref.object.sha}`, { token });

  return {
    commitSha: ref.object.sha,
    treeSha: commit.tree.sha,
  };
}

export async function createBlob({ owner, repo, contentBase64, token }) {
  return githubRequest(`/repos/${owner}/${repo}/git/blobs`, {
    method: "POST",
    token,
    body: {
      content: contentBase64,
      encoding: "base64",
    },
  });
}

export async function createTree({ owner, repo, baseTreeSha, entries, token }) {
  return githubRequest(`/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    token,
    body: {
      base_tree: baseTreeSha,
      tree: entries,
    },
  });
}

export async function createCommit({ owner, repo, message, treeSha, parentSha, token }) {
  return githubRequest(`/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    token,
    body: {
      message,
      tree: treeSha,
      parents: [parentSha],
    },
  });
}

export async function updateBranchRef({ owner, repo, branch, commitSha, token }) {
  return githubRequest(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: "PATCH",
    token,
    body: {
      sha: commitSha,
      force: false,
    },
  });
}
