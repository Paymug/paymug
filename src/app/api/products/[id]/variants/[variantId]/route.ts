import { getSessionUser } from "@/lib/auth";
import { findProductById } from "@/lib/db";
import { deleteVariant, updateVariant } from "@/lib/product-variants.db";
import { variantOverrideSchema } from "@/lib/product-variants.schema";
import { jsonError } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string; variantId: string }> };

async function ownedProduct(id: string) {
  const user = await getSessionUser();
  if (!user) return { error: jsonError("Unauthorized", 401) };
  const product = await findProductById(id);
  if (!product || product.userId !== user.id || product.environment !== user.environment) {
    return { error: jsonError("Not found", 404) };
  }
  return { product };
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id, variantId } = await ctx.params;
  const owned = await ownedProduct(id);
  if ("error" in owned) return owned.error;
  const parsed = variantOverrideSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "Invalid variant");
  const variant = await updateVariant(owned.product.id, variantId, parsed.data);
  if (!variant) return jsonError("Variant not found", 404);
  return Response.json({ variant });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id, variantId } = await ctx.params;
  const owned = await ownedProduct(id);
  if ("error" in owned) return owned.error;
  const variants = owned.product.variants ?? [];
  if (variants.length <= 1 && variants.some((variant) => variant.id === variantId)) {
    // Selling a product with variants needs at least one; delete the product instead.
    return jsonError("A product with variants needs at least one", 409);
  }
  if (!(await deleteVariant(owned.product.id, variantId))) {
    return jsonError("Variant not found", 404);
  }
  return Response.json({ deleted: true });
}
