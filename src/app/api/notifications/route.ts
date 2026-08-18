import { getSessionUser } from "@/lib/auth";
import { markAllNotificationsRead } from "@/lib/notifications";
import { jsonError } from "@/lib/utils";

export async function PATCH() {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  await markAllNotificationsRead(user.id, user.environment);
  return Response.json({ updated: true });
}
