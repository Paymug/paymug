import { getSessionUser } from "@/lib/auth";
import {
  deleteProductCategory,
  findProductCategory,
  updateProductCategory,
} from "@/lib/product-categories";
import { jsonError } from "@/lib/utils";
import {
  productCategorySchema,
  resolveProductCategorySlug,
} from "../category-api.utils";
import type { ProductCategoryRouteProps } from "./route.types";

export async function PATCH(
  request: Request,
  { params }: ProductCategoryRouteProps,
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const category = await findProductCategory(id, user.id);
  if (!category || category.storeId !== user.activeStoreId) {
    return jsonError("Category not found", 404);
  }
  const parsed = productCategorySchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid category");
  }
  try {
    const slug = await resolveProductCategorySlug(
      user.id,
      user.activeStoreId,
      parsed.data.slug,
      category.id,
    );
    return Response.json({
      category: await updateProductCategory(category, {
        ...parsed.data,
        slug,
      }),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not update category",
      409,
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: ProductCategoryRouteProps,
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const category = await findProductCategory(id, user.id);
  if (!category || category.storeId !== user.activeStoreId) {
    return jsonError("Category not found", 404);
  }
  await deleteProductCategory(category);
  return Response.json({ deleted: true });
}
