import { getSessionUser } from "@/lib/auth";
import { revokeApiKey } from "@/lib/feature-records";
import { jsonError } from "@/lib/utils";
import type { ApiKeyRouteContext } from "./route.types";

export async function DELETE(
  _req: Request,
  { params }: ApiKeyRouteContext
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const revoked = await revokeApiKey(id, user.id);
  if (!revoked) return jsonError("API key not found", 404);
  return Response.json({ revoked: true });
}
