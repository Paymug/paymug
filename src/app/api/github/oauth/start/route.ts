import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { getGitHubOAuthHostname } from "@/lib/db";
import {
  createGitHubOAuthState,
  getGitHubOAuthAuthorizeUrl,
  githubOAuthStateCookie,
} from "@/lib/github-oauth";
import { jsonError } from "@/lib/utils";
import { getRuntimeEnvValue } from "@/lib/runtime-env";
import { requireProFeature } from "@/lib/pro-feature-access";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const denied = await requireProFeature("private_github");
  if (denied) return denied;

  try {
    if (!(await getRuntimeEnvValue("ENCRYPTION_SECRET"))) {
      return jsonError("ENCRYPTION_SECRET is not configured", 500);
    }
    const state = createGitHubOAuthState();
    const hostname = await getGitHubOAuthHostname(user.id);
    const cookieJar = await cookies();
    cookieJar.set(githubOAuthStateCookie, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });
    return Response.redirect(
      await getGitHubOAuthAuthorizeUrl(state, request.url, hostname),
      302
    );
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Could not start GitHub authorization",
      500
    );
  }
}
