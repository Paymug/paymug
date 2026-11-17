import { getSessionUserId } from "@/lib/auth";
import {
  applyPendingDatabaseMigrations,
  databaseUserExists,
  getPendingDatabaseMigrations,
} from "@/lib/initial-setup";
import { jsonError } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function isSignedIn(): Promise<boolean> {
  const userId = await getSessionUserId();
  return Boolean(userId && (await databaseUserExists(userId)));
}

export async function GET() {
  if (!(await isSignedIn())) return jsonError("Unauthorized", 401);
  const pending = await getPendingDatabaseMigrations();
  return Response.json({ ready: pending.length === 0, pending });
}

export async function POST(request: Request) {
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    return jsonError("Invalid request origin", 403);
  }
  if (!(await isSignedIn())) return jsonError("Unauthorized", 401);
  try {
    const result = await applyPendingDatabaseMigrations();
    return Response.json({ ready: true, ...result });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not apply migrations",
      500,
    );
  }
}
