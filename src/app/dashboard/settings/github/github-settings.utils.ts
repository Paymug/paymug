import { getRuntimeConfiguration } from "@/lib/runtime-env";
import type { GitHubOAuthRuntimeConfig } from "./page.types";

export async function getGitHubOAuthConfigStatus(): Promise<GitHubOAuthRuntimeConfig> {
  const runtime = await getRuntimeConfiguration();
  const clientIdConfigured = Boolean(runtime.values.GITHUB_CLIENT_ID);
  const clientSecretConfigured = Boolean(
    runtime.values.GITHUB_CLIENT_SECRET
  );
  const encryptionConfigured = Boolean(runtime.values.ENCRYPTION_SECRET);
  return {
    clientIdConfigured,
    clientSecretConfigured,
    encryptionConfigured,
    ready:
      clientIdConfigured &&
      clientSecretConfigured &&
      encryptionConfigured,
  };
}

export function getGitHubOAuthErrorMessage(error?: string): string {
  const messages: Record<string, string> = {
    github_encryption_not_configured:
      "ENCRYPTION_SECRET is missing in production, so the GitHub token could not be stored.",
    github_oauth_not_configured:
      "The GitHub OAuth client ID or secret is missing in production.",
    github_repo_scope_missing:
      "GitHub authorization did not grant private repository access. Reauthorize and approve the repository permission.",
    github_code_exchange_failed:
      "GitHub rejected the authorization code. Verify the OAuth App client secret and exact callback URL.",
    github_profile_failed:
      "The token was created, but GitHub could not return the authorized account profile.",
    github_profile_unauthorized:
      "GitHub created a token but rejected it when Paymug requested your profile. Reauthorize after verifying that the production client ID and secret belong to the same OAuth App.",
    github_profile_forbidden:
      "GitHub refused the authorized profile request. Try again; if it continues, check GitHub API rate limits or organization access policies.",
    github_profile_rate_limited:
      "GitHub temporarily rate-limited the profile request. Wait briefly, then authorize again.",
    github_token_encryption_failed:
      "The GitHub token could not be encrypted. Verify ENCRYPTION_SECRET in production.",
    github_connection_storage_failed:
      "GitHub authorized successfully, but the connection could not be saved to the production database.",
    github_store_link_failed:
      "The GitHub connection was saved, but it could not be linked to the active store.",
    invalid_oauth_response:
      "The OAuth state cookie was missing or invalid. Start authorization again from this page on the same hostname.",
    access_denied:
      "GitHub authorization was cancelled or denied. Start again and approve repository access.",
    redirect_uri_mismatch:
      "The callback URL does not match the GitHub OAuth App configuration. Copy the exact URL shown below into GitHub.",
  };
  return error
    ? messages[error] || "GitHub authorization could not be completed."
    : "GitHub authorization could not be completed.";
}
