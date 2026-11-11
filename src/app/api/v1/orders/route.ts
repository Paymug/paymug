import { authorizeApiKey } from "@/lib/api-keys";
import { findUserById, listOrdersByUser } from "@/lib/db";

export async function GET(req: Request) {
  const auth = await authorizeApiKey(req, "orders", "read");
  if ("error" in auth) return auth.error;
  const { apiKey } = auth;
  const user = await findUserById(apiKey.userId);
  return Response.json({
    orders: await listOrdersByUser(
      apiKey.userId,
      undefined,
      user?.environment
    ),
  });
}
