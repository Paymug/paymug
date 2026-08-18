import "server-only";

import { randomBytes } from "crypto";
import { getGitHubCallbackUrlForHostname } from "./github-hostname.utils";
import { getRuntimeAbsoluteUrl, getRuntimeEnvValue } from "./runtime-env";

export const githubOAuthStateCookie = "paymug_github_oauth_state";

export function createGitHubOAuthState(): string {
  return randomBytes(24).toString("hex");
}

export async function getGitHubOAuthAuthorizeUrl(
  state: string,
  requestUrl: string,
  hostname?: string
): Promise<string> {
  const clientId = await getRuntimeEnvValue("GITHUB_CLIENT_ID");
  if (!clientId) throw new Error("GITHUB_CLIENT_ID is not configured");

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set(
    "redirect_uri",
    hostname
      ? getGitHubCallbackUrlForHostname(hostname, requestUrl)
      : await getRuntimeAbsoluteUrl("/api/github/oauth/callback", requestUrl)
  );
  url.searchParams.set("scope", "repo read:user");
  url.searchParams.set("state", state);
  return url.toString();
}
