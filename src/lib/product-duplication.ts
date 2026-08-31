import "server-only";

import { createProduct, findProductById } from "./db";
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
  return createProduct({
    ...source,
    id,
    name,
    slug: "",
    purchaseCount: 0,
    createdAt: now,
    updatedAt: now,
  });
}
