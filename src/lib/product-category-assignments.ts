import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { productCategoryProducts } from "@/db/schema";

export async function getProductCategoryIds(
  productIds: string[],
): Promise<Map<string, string[]>> {
  const assignments = new Map<string, string[]>();
  if (!productIds.length) return assignments;
  const db = await getDb();
  const rows = await db.query.productCategoryProducts.findMany({
    where: inArray(productCategoryProducts.productId, productIds),
  });
  for (const row of rows) {
    assignments.set(row.productId, [
      ...(assignments.get(row.productId) || []),
      row.categoryId,
    ]);
  }
  return assignments;
}

export async function replaceProductCategories(
  productId: string,
  categoryIds: string[],
): Promise<void> {
  const db = await getDb();
  const uniqueCategoryIds = [...new Set(categoryIds)];
  await db
    .delete(productCategoryProducts)
    .where(eq(productCategoryProducts.productId, productId));
  if (!uniqueCategoryIds.length) return;
  const createdAt = new Date().toISOString();
  await db.insert(productCategoryProducts).values(
    uniqueCategoryIds.map((categoryId) => ({
      categoryId,
      productId,
      createdAt,
    })),
  );
}

export async function replaceCategoryProducts(
  categoryId: string,
  productIds: string[],
  scopedProductIds?: string[],
): Promise<void> {
  const db = await getDb();
  const uniqueProductIds = [...new Set(productIds)];
  if (scopedProductIds && !scopedProductIds.length) return;
  await db
    .delete(productCategoryProducts)
    .where(
      scopedProductIds
        ? and(
            eq(productCategoryProducts.categoryId, categoryId),
            inArray(productCategoryProducts.productId, scopedProductIds),
          )
        : eq(productCategoryProducts.categoryId, categoryId),
    );
  if (!uniqueProductIds.length) return;
  const createdAt = new Date().toISOString();
  await db.insert(productCategoryProducts).values(
    uniqueProductIds.map((productId) => ({
      categoryId,
      productId,
      createdAt,
    })),
  );
}
