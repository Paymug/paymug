import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { findProductById } from "@/lib/db";
import { replaceProductCategories } from "@/lib/product-category-assignments";
import { validateProductCategoryIds } from "@/lib/product-categories";
import { jsonError } from "@/lib/utils";

const updateSchema = z.object({
  categoryIds: z.array(z.string().min(1)).max(100),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const product = await findProductById(id);
  if (
    !product ||
    product.userId !== user.id ||
    product.environment !== user.environment
  ) {
    return jsonError("Product not found", 404);
  }
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid categories");
  }
  const valid = await validateProductCategoryIds(
    user.id,
    user.activeStoreId,
    parsed.data.categoryIds,
  );
  if (!valid) return jsonError("Category not found", 404);
  await replaceProductCategories(id, parsed.data.categoryIds);
  return Response.json({ updated: true });
}
