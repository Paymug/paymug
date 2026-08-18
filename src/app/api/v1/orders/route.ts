import { authenticateApiKey } from "@/lib/api-keys";
import { findUserById, listOrdersByUser } from "@/lib/db";
import { jsonError } from "@/lib/utils";

export async function GET(req: Request) {
  const apiKey = await authenticateApiKey(req);
  if (!apiKey) return jsonError("Invalid or expired API key", 401);
  const user = await findUserById(apiKey.userId);
  return Response.json({
    orders: await listOrdersByUser(
      apiKey.userId,
      undefined,
      user?.environment
    ),
  });
}
