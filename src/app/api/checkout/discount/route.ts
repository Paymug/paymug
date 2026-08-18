import { z } from "zod";
import { resolveDiscount } from "@/lib/commerce-features";
import { findProductById } from "@/lib/db";
import { calculateCheckoutPricing } from "@/lib/product-pricing";
import { jsonError } from "@/lib/utils";

const schema = z.object({
  productId: z.string().min(1),
  code: z.string().trim().min(1).max(60),
});

export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || "Invalid input");
    }

    const product = await findProductById(parsed.data.productId);
    if (!product || product.status !== "published") {
      return jsonError("Product not available", 404);
    }

    const discount = await resolveDiscount(
      product.userId,
      parsed.data.code,
      product.price,
      product.id,
      product.storeId,
      product.environment
    );
    const pricing = calculateCheckoutPricing(product, discount?.amount);

    return Response.json({
      valid: true,
      code: discount?.code,
      subscriptionPeriods: discount?.subscriptionPeriods,
      ...pricing,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not validate discount",
      400
    );
  }
}
