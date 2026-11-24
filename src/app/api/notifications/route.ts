import { getSessionUser } from "@/lib/auth";
import { listNotificationsPage, markAllNotificationsRead } from "@/lib/notifications";
import { jsonError } from "@/lib/utils";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const params = new URL(request.url).searchParams;
  const limit = Math.min(Math.max(Number(params.get("limit")) || 20, 1), 50);
  const raw = params.get("cursor");
  const sep = raw ? raw.lastIndexOf("|") : -1;
  const cursor =
    raw && sep > 0
      ? { createdAt: raw.slice(0, sep), id: raw.slice(sep + 1) }
      : undefined;
  return Response.json(
    await listNotificationsPage(user.id, user.environment, limit, cursor)
  );
}

export async function PATCH() {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  await markAllNotificationsRead(user.id, user.environment);
  return Response.json({ updated: true });
}
