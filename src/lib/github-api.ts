import "server-only";

import type {
  GitHubCollaboratorInvitation,
  GitHubOAuthTokenResponse,
  GitHubRepository,
  GitHubUserSearchResponse,
  GitHubViewer,
} from "./github.types";
import { getRuntimeConfiguration } from "./runtime-env";

const githubApiVersion = "2026-03-10";
const githubUserAgent = "Paymug";

async function githubRequest<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
  allowedStatuses: number[] = []
): Promise<{ data?: T; status: number }> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("User-Agent", githubUserAgent);
  headers.set("X-GitHub-Api-Version", githubApiVersion);
  if (init?.body) headers.set("Content-Type", "application/json");

  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers,
  });
  if (!response.ok && !allowedStatuses.includes(response.status)) {
    throw new Error(
      `GitHub request failed (${response.status}): ${await response.text()}`
    );
  }

  const data =
    response.status === 204
      ? undefined
      : ((await response.json()) as T);
  return { data, status: response.status };
}

export async function exchangeGitHubOAuthCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; scopes: string }> {
  const runtime = await getRuntimeConfiguration();
  const clientId = runtime.values.GITHUB_CLIENT_ID;
  const clientSecret = runtime.values.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GitHub OAuth credentials are not configured");
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": githubUserAgent,
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  const data = (await response.json()) as GitHubOAuthTokenResponse;
  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "GitHub authorization failed"
    );
  }
  return {
    accessToken: data.access_token,
    scopes: data.scope || "",
  };
}

export async function getGitHubViewer(
  accessToken: string
): Promise<GitHubViewer> {
  const response = await githubRequest<GitHubViewer>(
    accessToken,
    "/user"
  );
  return response.data!;
}

export async function getGitHubUser(
  accessToken: string,
  username: string
): Promise<GitHubViewer> {
  const response = await githubRequest<GitHubViewer>(
    accessToken,
    `/users/${encodeURIComponent(username)}`
  );
  return response.data!;
}

export async function findGitHubUserByPublicEmail(
  accessToken: string,
  email: string
): Promise<GitHubViewer | undefined> {
  const normalizedEmail = email.trim().toLowerCase();
  const response = await githubRequest<GitHubUserSearchResponse>(
    accessToken,
    `/search/users?q=${encodeURIComponent(`${normalizedEmail} in:email`)}&per_page=10`
  );
  const candidates = await Promise.all(
    (response.data?.items || [])
      .slice(0, 10)
      .map((candidate) => getGitHubUser(accessToken, candidate.login))
  );
  return candidates.find(
    (candidate) => candidate.email?.trim().toLowerCase() === normalizedEmail
  );
}

export async function listGitHubAdminRepositories(
  accessToken: string
): Promise<GitHubRepository[]> {
  return (await listGitHubPrivateRepositories(accessToken)).filter(
    (repository) => repository.private && repository.permissions?.admin
  );
}

export async function listGitHubPrivateRepositories(
  accessToken: string,
): Promise<GitHubRepository[]> {
  const repositories: GitHubRepository[] = [];
  for (let page = 1; page <= 10; page += 1) {
    const response = await githubRequest<GitHubRepository[]>(
      accessToken,
      `/user/repos?visibility=private&affiliation=owner,collaborator,organization_member&sort=full_name&direction=asc&per_page=100&page=${page}`,
    );
    const pageRepositories = response.data || [];
    repositories.push(...pageRepositories);
    if (pageRepositories.length < 100) break;
  }
  return repositories;
}

export async function addGitHubRepositoryCollaborator(
  accessToken: string,
  owner: string,
  repository: string,
  username: string
): Promise<{ invitationId?: string; alreadyHadAccess: boolean }> {
  const response = await githubRequest<GitHubCollaboratorInvitation>(
    accessToken,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/collaborators/${encodeURIComponent(username)}`,
    {
      method: "PUT",
      body: JSON.stringify({ permission: "pull" }),
    }
  );
  return {
    invitationId: response.data?.id
      ? String(response.data.id)
      : undefined,
    alreadyHadAccess: response.status === 204,
  };
}

export async function removeGitHubRepositoryCollaborator(
  accessToken: string,
  owner: string,
  repository: string,
  username: string
): Promise<void> {
  await githubRequest(
    accessToken,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/collaborators/${encodeURIComponent(username)}`,
    { method: "DELETE" },
    [404]
  );
}

export async function deleteGitHubRepositoryInvitation(
  accessToken: string,
  owner: string,
  repository: string,
  invitationId: string
): Promise<void> {
  await githubRequest(
    accessToken,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/invitations/${encodeURIComponent(invitationId)}`,
    { method: "DELETE" },
    [404]
  );
}
