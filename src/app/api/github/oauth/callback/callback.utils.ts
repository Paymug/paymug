import type { GitHubOAuthCallbackStage } from "./callback.types";

export function getGitHubOAuthCallbackErrorCode(
  stage: GitHubOAuthCallbackStage,
  error: unknown
): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("encryption_secret")) {
    return "github_encryption_not_configured";
  }
  if (message.includes("credentials are not configured")) {
    return "github_oauth_not_configured";
  }
  if (stage === "scope") return "github_repo_scope_missing";
  if (stage === "exchange") return "github_code_exchange_failed";
  if (stage === "profile") {
    if (message.includes("github request failed (401)")) {
      return "github_profile_unauthorized";
    }
    if (message.includes("github request failed (403)")) {
      return "github_profile_forbidden";
    }
    if (message.includes("github request failed (429)")) {
      return "github_profile_rate_limited";
    }
    return "github_profile_failed";
  }
  if (stage === "encryption") return "github_token_encryption_failed";
  if (stage === "storage") return "github_connection_storage_failed";
  if (stage === "store") return "github_store_link_failed";
  return "github_connection_failed";
}

export function logGitHubOAuthCallbackError(
  stage: GitHubOAuthCallbackStage,
  error: unknown
): void {
  console.error("GitHub OAuth callback failed", {
    stage,
    message: error instanceof Error ? error.message : "Unknown error",
  });
}
