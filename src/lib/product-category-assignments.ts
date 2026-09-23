import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
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

export async function getCategoryProductOrder(
  categoryIds: string[],
): Promise<Map<string, string[]>> {
  const order = new Map<string, string[]>();
  if (!categoryIds.length) return order;
  const db = await getDb();
  const rows = await db.query.productCategoryProducts.findMany({
    where: inArray(productCategoryProducts.categoryId, categoryIds),
    orderBy: [
      asc(productCategoryProducts.sortOrder),
      asc(productCategoryProducts.createdAt),
    ],
  });
  for (const row of rows) {
    order.set(row.categoryId, [
      ...(order.get(row.categoryId) || []),
      row.productId,
    ]);
  }
  return order;
}

export async function replaceProductCategories(
  productId: string,
  categoryIds: string[],
): Promise<void> {
  const db = await getDb();
  const uniqueCategoryIds = [...new Set(categoryIds)];
  const existing = await db.query.productCategoryProducts.findMany({
    where: eq(productCategoryProducts.productId, productId),
  });
  const existingOrder = new Map(
    existing.map((row) => [row.categoryId, row.sortOrder]),
  );
  const maxByCategory = new Map<string, number>();
  if (uniqueCategoryIds.length) {
    const categoryRows = await db.query.productCategoryProducts.findMany({
      where: inArray(productCategoryProducts.categoryId, uniqueCategoryIds),
    });
    for (const row of categoryRows) {
      maxByCategory.set(
        row.categoryId,
        Math.max(maxByCategory.get(row.categoryId) ?? -1, row.sortOrder),
      );
    }
  }
  await db
    .delete(productCategoryProducts)
    .where(eq(productCategoryProducts.productId, productId));
  if (!uniqueCategoryIds.length) return;
  const createdAt = new Date().toISOString();
  await db.insert(productCategoryProducts).values(
    uniqueCategoryIds.map((categoryId) => ({
      categoryId,
      productId,
      sortOrder:
        existingOrder.get(categoryId) ??
        (maxByCategory.get(categoryId) ?? -1) + 1,
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
  const existing = await db.query.productCategoryProducts.findMany({
    where: eq(productCategoryProducts.categoryId, categoryId),
  });
  const existingOrder = new Map(
    existing.map((row) => [row.productId, row.sortOrder]),
  );
  let maxOrder = existing.reduce(
    (max, row) => Math.max(max, row.sortOrder),
    -1,
  );
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
    uniqueProductIds.map((productId) => {
      const existingSort = existingOrder.get(productId);
      if (existingSort === undefined) maxOrder += 1;
      return {
        categoryId,
        productId,
        sortOrder: existingSort ?? maxOrder,
        createdAt,
      };
    }),
  );
}

export async function reorderCategoryProducts(
  categoryId: string,
  orderedProductIds: string[],
): Promise<void> {
  const order = await getCategoryProductOrder([categoryId]);
  const currentIds = order.get(categoryId) ?? [];
  const currentSet = new Set(currentIds);
  const requested = [...new Set(orderedProductIds)];
  if (requested.some((id) => !currentSet.has(id))) {
    throw new Error("Invalid product order");
  }
  const requestedSet = new Set(requested);
  const next: string[] = [];
  let inserted = false;
  for (const id of currentIds) {
    if (requestedSet.has(id)) {
      if (!inserted) {
        next.push(...requested);
        inserted = true;
      }
    } else {
      next.push(id);
    }
  }
  const db = await getDb();
  await Promise.all(
    next.map((productId, sortOrder) =>
      db
        .update(productCategoryProducts)
        .set({ sortOrder })
        .where(
          and(
            eq(productCategoryProducts.categoryId, categoryId),
            eq(productCategoryProducts.productId, productId),
          ),
        ),
    ),
  );
}
