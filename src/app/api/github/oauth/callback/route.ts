import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import {
  clearGitHubProductDeliveries,
  getGitHubConnection,
  getGitHubOAuthHostname,
  upsertGitHubConnection,
} from "@/lib/db";
import {
  exchangeGitHubOAuthCode,
  getGitHubViewer,
} from "@/lib/github-api";
import { githubOAuthStateCookie } from "@/lib/github-oauth";
import { revokeAllGitHubAccess } from "@/lib/github-access";
import { getGitHubCallbackUrlForHostname } from "@/lib/github-hostname.utils";
import { getRuntimeAbsoluteUrl } from "@/lib/runtime-env";
import { enableStoreCredential } from "@/lib/stores";
import {
  getGitHubOAuthCallbackErrorCode,
  logGitHubOAuthCallbackError,
} from "./callback.utils";
import type { GitHubOAuthCallbackStage } from "./callback.types";

export async function GET(request: Request) {
  const settingsUrl = new URL(
    await getRuntimeAbsoluteUrl("/dashboard/settings/github", request.url)
  );
  const user = await getSessionUser();
  if (!user) {
    return Response.redirect(
      await getRuntimeAbsoluteUrl("/login", request.url),
      302
    );
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const cookieJar = await cookies();
  const expectedState = cookieJar.get(githubOAuthStateCookie)?.value;
  cookieJar.delete(githubOAuthStateCookie);

  if (error || !code || !state || !expectedState || state !== expectedState) {
    settingsUrl.searchParams.set(
      "error",
      error || "invalid_oauth_response"
    );
    return Response.redirect(settingsUrl, 302);
  }

  let stage: GitHubOAuthCallbackStage = "exchange";
  try {
    const hostname = await getGitHubOAuthHostname(user.id);
    const token = await exchangeGitHubOAuthCode(
      code,
      hostname
        ? getGitHubCallbackUrlForHostname(hostname, request.url)
        : await getRuntimeAbsoluteUrl(
            "/api/github/oauth/callback",
            request.url
          )
    );
    stage = "scope";
    if (!token.scopes.split(",").map((scope) => scope.trim()).includes("repo")) {
      throw new Error("GitHub repository permission was not granted");
    }
    stage = "profile";
    const viewer = await getGitHubViewer(token.accessToken);
    const existingConnection = await getGitHubConnection(
      user.id,
      user.activeStoreId
    );
    if (
      existingConnection &&
      existingConnection.githubUserId !== String(viewer.id)
    ) {
      await revokeAllGitHubAccess(user.id);
      await clearGitHubProductDeliveries(user.id);
    }
    stage = "encryption";
    const accessTokenEncrypted = await encryptSecret(token.accessToken);
    stage = "storage";
    await upsertGitHubConnection({
      userId: user.id,
      githubUserId: String(viewer.id),
      login: viewer.login,
      accessTokenEncrypted,
      scopes: token.scopes,
      connectedAt: new Date().toISOString(),
    });
    stage = "store";
    await enableStoreCredential(
      user.id,
      user.activeStoreId,
      "github"
    );
    settingsUrl.searchParams.set("connected", "1");
  } catch (error) {
    logGitHubOAuthCallbackError(stage, error);
    settingsUrl.searchParams.set(
      "error",
      getGitHubOAuthCallbackErrorCode(stage, error)
    );
  }

  return Response.redirect(settingsUrl, 302);
}
