import { getSessionUser } from "@/lib/auth";
import {
  deleteStorePage,
  findStorePage,
  updateStorePage,
} from "@/lib/store-pages";
import { jsonError } from "@/lib/utils";
import { storePageSchema } from "../page-api.utils";
import type { StorePageRouteProps } from "./route.types";
import { requireProFeature } from "@/lib/pro-feature-access";

export async function PATCH(
  request: Request,
  { params }: StorePageRouteProps,
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const denied = await requireProFeature("pages");
  if (denied) return denied;
  const { id } = await params;
  const page = await findStorePage(id, user.id);
  if (
    !page ||
    page.storeId !== user.activeStoreId ||
    page.environment !== user.environment
  ) {
    return jsonError("Page not found", 404);
  }
  const parsed = storePageSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid page");
  }
  try {
    return Response.json({ page: await updateStorePage(page, parsed.data) });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not update page",
      409,
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: StorePageRouteProps,
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const denied = await requireProFeature("pages");
  if (denied) return denied;
  const { id } = await params;
  const page = await findStorePage(id, user.id);
  if (
    !page ||
    page.storeId !== user.activeStoreId ||
    page.environment !== user.environment
  ) {
    return jsonError("Page not found", 404);
  }
  await deleteStorePage(page);
  return Response.json({ deleted: true });
}
