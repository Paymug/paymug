import { authenticateApiKey } from "@/lib/api-keys";
import { findUserById, listProductsByUser } from "@/lib/db";
import { jsonError } from "@/lib/utils";

export async function GET(req: Request) {
  const apiKey = await authenticateApiKey(req);
  if (!apiKey) return jsonError("Invalid or expired API key", 401);
  const user = await findUserById(apiKey.userId);
  return Response.json({
    products: await listProductsByUser(
      apiKey.userId,
      undefined,
      user?.environment
    ),
  });
}
