import { z } from "zod";
import { slugify } from "@/lib/format";
import { findProductCategoryBySlug } from "@/lib/product-categories";
import { findStorePageBySlug } from "@/lib/store-pages";
import { isReservedStorefrontSlug } from "@/lib/storefront-slug.utils";

export const productCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().default(""),
});

export async function resolveProductCategorySlug(
  userId: string,
  storeId: string,
  requestedSlug: string,
  currentCategoryId?: string,
): Promise<string> {
  const slug = slugify(requestedSlug);
  if (!slug || isReservedStorefrontSlug(slug)) {
    throw new Error("Choose a different category slug");
  }
  const [category, sandboxPage, livePage] = await Promise.all([
    findProductCategoryBySlug(storeId, slug),
    findStorePageBySlug(userId, storeId, "sandbox", slug),
    findStorePageBySlug(userId, storeId, "live", slug),
  ]);
  if (category && category.id !== currentCategoryId) {
    throw new Error("This category URL is already in use");
  }
  if (sandboxPage || livePage) {
    throw new Error("This URL is already used by a store page");
  }
  return slug;
}
