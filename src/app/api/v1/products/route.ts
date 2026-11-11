import { authorizeApiKey } from "@/lib/api-keys";
import { findUserById, listProductsByUser } from "@/lib/db";

export async function GET(req: Request) {
  const auth = await authorizeApiKey(req, "products", "read");
  if ("error" in auth) return auth.error;
  const { apiKey } = auth;
  const user = await findUserById(apiKey.userId);
  return Response.json({
    products: await listProductsByUser(
      apiKey.userId,
      undefined,
      user?.environment
    ),
  });
}
