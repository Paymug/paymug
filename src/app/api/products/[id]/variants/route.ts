import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { findProductById } from "@/lib/db";
import { createVariant, listVariantsForProduct } from "@/lib/product-variants.db";
import { variantOverrideSchema } from "@/lib/product-variants.schema";
import { jsonError } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

async function ownedProduct(id: string) {
  const user = await getSessionUser();
  if (!user) return { error: jsonError("Unauthorized", 401) };
  const product = await findProductById(id);
  if (!product || product.userId !== user.id || product.environment !== user.environment) {
    return { error: jsonError("Not found", 404) };
  }
  return { product };
}

export async function GET(_request: Request, ctx: Ctx) {
  const owned = await ownedProduct((await ctx.params).id);
  if ("error" in owned) return owned.error;
  return Response.json({ variants: await listVariantsForProduct(owned.product.id) });
}

const createSchema = variantOverrideSchema.extend({
  name: z.string().trim().min(1).max(120),
  price: z.number().int().min(0).max(1_000_000_000),
});

export async function POST(request: Request, ctx: Ctx) {
  const owned = await ownedProduct((await ctx.params).id);
  if ("error" in owned) return owned.error;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "Invalid variant");
  const variant = await createVariant(owned.product, parsed.data);
  return Response.json({ variant }, { status: 201 });
}
