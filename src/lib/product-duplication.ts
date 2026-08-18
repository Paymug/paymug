import "server-only";

import { createProduct, findProductById } from "./db";
import { slugify } from "./format";
import { uid } from "./utils";
import type { Product } from "./types";

export async function duplicateProduct(
  productId: string,
  userId: string,
  name: string,
  environment: Product["environment"],
): Promise<Product | undefined> {
  const source = await findProductById(productId);
  if (
    !source ||
    source.userId !== userId ||
    source.environment !== environment
  ) return undefined;

  const id = uid();
  const now = new Date().toISOString();
  const baseSlug = slugify(name) || "product";
  return createProduct({
    ...source,
    id,
    name,
    slug: `${baseSlug}-${id.slice(0, 6)}`,
    createdAt: now,
    updatedAt: now,
  });
}
