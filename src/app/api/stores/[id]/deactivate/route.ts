import { getSessionUser } from "@/lib/auth";
import { requireProFeature } from "@/lib/pro-feature-access";
import { deactivateStore } from "@/lib/stores";
import { jsonError } from "@/lib/utils";
import type { DeactivateStoreRouteProps } from "./route.types";

export async function POST(
  _request: Request,
  { params }: DeactivateStoreRouteProps,
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const denied = await requireProFeature("multi_store");
  if (denied) return denied;
  const { id } = await params;
  if (id !== user.activeStoreId) {
    return jsonError("Only the current store can be deactivated", 409);
  }
  try {
    const activeStore = await deactivateStore(id, user.id);
    return activeStore
      ? Response.json({ activeStore })
      : jsonError("Store not found", 404);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not deactivate store",
      409,
    );
  }
}
