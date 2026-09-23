import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { findProductCategory } from "@/lib/product-categories";
import { reorderCategoryProducts } from "@/lib/product-category-assignments";
import { jsonError } from "@/lib/utils";

const reorderSchema = z.object({
  productIds: z.array(z.string().min(1)).max(2000),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const category = await findProductCategory(id, user.id);
  if (!category || category.storeId !== user.activeStoreId) {
    return jsonError("Category not found", 404);
  }
  const parsed = reorderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid product order");
  }
  try {
    await reorderCategoryProducts(id, parsed.data.productIds);
    return Response.json({ reordered: true });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not reorder products",
      400,
    );
  }
}
