import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { updateGitHubOAuthHostname } from "@/lib/db";
import {
  getGitHubCallbackUrlForHostname,
  normalizeGitHubHostname,
} from "@/lib/github-hostname.utils";
import { jsonError } from "@/lib/utils";
import { requireProFeature } from "@/lib/pro-feature-access";

const schema = z.object({
  hostname: z.string().trim().min(1).max(255),
});

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const denied = await requireProFeature("private_github");
  if (denied) return denied;

  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || "Invalid hostname");
    }
    const hostname = normalizeGitHubHostname(parsed.data.hostname);
    await updateGitHubOAuthHostname(user.id, hostname);
    return Response.json({
      hostname,
      callbackUrl: getGitHubCallbackUrlForHostname(hostname, request.url),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not save hostname",
      400
    );
  }
}
