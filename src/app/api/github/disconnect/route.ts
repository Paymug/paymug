import { getSessionUser } from "@/lib/auth";
import {
  clearGitHubProductDeliveries,
  deleteGitHubConnection,
} from "@/lib/db";
import { revokeAllGitHubAccess } from "@/lib/github-access";
import { getRuntimeAbsoluteUrl } from "@/lib/runtime-env";
import { jsonError } from "@/lib/utils";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);

  try {
    await revokeAllGitHubAccess(user.id);
    await clearGitHubProductDeliveries(user.id);
    await deleteGitHubConnection(user.id);
    return Response.redirect(
      await getRuntimeAbsoluteUrl(
        "/dashboard/settings/github?disconnected=1",
        request.url
      ),
      303
    );
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Could not disconnect GitHub",
      400
    );
  }
}
