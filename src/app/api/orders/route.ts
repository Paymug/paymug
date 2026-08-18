import { getSessionUser } from "@/lib/auth";
import { listOrdersByUser } from "@/lib/db";
import { jsonError } from "@/lib/utils";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const orders = await listOrdersByUser(
    user.id,
    user.activeStoreId,
    user.environment
  );
  return Response.json({ orders });
}
