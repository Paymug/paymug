import { authenticateApiKey } from "@/lib/api-keys";
import { hasApiKeyScope } from "@/lib/api-key-scopes";
import { getSessionUser, runAsApiKeyUser } from "@/lib/auth";
import { getStoreById } from "@/lib/stores";
import { jsonError } from "@/lib/utils";

type MigrationUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

/**
 * Dashboard session, or an API key with `migrations:write`. Migration is free:
 * deliberately no Pro check here.
 */
export async function authorizeMigration(
  request: Request,
  action: "read" | "write",
): Promise<{ user: MigrationUser } | { error: Response }> {
  const bearer =
    request.headers.get("authorization")?.startsWith("Bearer ") ||
    request.headers.get("x-api-key");
  if (bearer) {
    const key = await authenticateApiKey(request);
    if (!key) return { error: jsonError("Invalid or expired API key", 401) };
    if (!hasApiKeyScope(key.scopes, "migrations", action)) {
      return { error: jsonError(`API key lacks the migrations:${action} permission`, 403) };
    }
    const user = await runAsApiKeyUser(key.userId, () => getSessionUser());
    if (!user) return { error: jsonError("Unauthorized", 401) };
    return withStore(user, action);
  }
  const user = await getSessionUser();
  if (!user) return { error: jsonError("Unauthorized", 401) };
  return withStore(user, action);
}

async function withStore(
  user: MigrationUser,
  action: "read" | "write",
): Promise<{ user: MigrationUser } | { error: Response }> {
  // A new account has no store row yet; importing would break on the FK.
  if (action === "write" && !(await getStoreById(user.activeStoreId, user.id))) {
    return { error: jsonError("Create a store before migrating", 409) };
  }
  return { user };
}

export function lsErrorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Lemon Squeezy request failed";
  const status = typeof (error as { status?: unknown })?.status === "number"
    ? ((error as { status: number }).status === 401 || (error as { status: number }).status === 403 ? 400 : 502)
    : 500;
  return jsonError(message, status);
}
