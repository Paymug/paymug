import { getSessionUser } from "@/lib/auth";
import { requireProFeature } from "@/lib/pro-feature-access";
import { reactivateStore } from "@/lib/stores";
import { jsonError } from "@/lib/utils";
import type { ReactivateStoreRouteProps } from "./route.types";

export async function POST(
  _request: Request,
  { params }: ReactivateStoreRouteProps,
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const denied = await requireProFeature("multi_store");
  if (denied) return denied;
  const { id } = await params;
  const store = await reactivateStore(id, user.id);
  return store
    ? Response.json({ store })
    : jsonError("Store not found", 404);
}
