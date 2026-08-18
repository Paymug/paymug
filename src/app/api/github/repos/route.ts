import { getSessionUser } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { getGitHubConnection } from "@/lib/db";
import { listGitHubPrivateRepositories } from "@/lib/github-api";
import { jsonError } from "@/lib/utils";
import { requireProFeature } from "@/lib/pro-feature-access";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const denied = await requireProFeature("private_github");
  if (denied) return denied;
  const connection = await getGitHubConnection(
    user.id,
    user.activeStoreId
  );
  if (!connection) {
    return Response.json({ connected: false, repositories: [] });
  }

  try {
    const repositories = await listGitHubPrivateRepositories(
      await decryptSecret(connection.accessTokenEncrypted)
    );
    return Response.json({
      connected: true,
      login: connection.login,
      repositories: repositories.map((repository) => ({
        id: String(repository.id),
        owner: repository.owner.login,
        name: repository.name,
        fullName: repository.full_name,
        url: repository.html_url,
        disabled: !repository.permissions?.admin,
        disabledReason: repository.permissions?.admin
          ? undefined
          : "Admin access required",
      })),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Could not load GitHub repositories",
      400
    );
  }
}
