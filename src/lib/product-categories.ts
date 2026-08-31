import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { productCategories } from "@/db/schema";
import { getDb } from "@/db";
import { slugify } from "./format";
import type { ProductCategoryInput } from "./product-categories.types";
import type { ProductCategory } from "./types";
import { uid } from "./utils";

export async function listProductCategories(
  userId: string,
  storeId: string,
): Promise<ProductCategory[]> {
  const db = await getDb();
  return db.query.productCategories.findMany({
    where: and(
      eq(productCategories.userId, userId),
      eq(productCategories.storeId, storeId),
    ),
    orderBy: [
      asc(productCategories.sortOrder),
      asc(productCategories.createdAt),
    ],
  });
}

export async function findProductCategory(
  id: string,
  userId?: string,
): Promise<ProductCategory | undefined> {
  const db = await getDb();
  return db.query.productCategories.findFirst({
    where: userId
      ? and(eq(productCategories.id, id), eq(productCategories.userId, userId))
      : eq(productCategories.id, id),
  });
}

export async function findProductCategoryBySlug(
  storeId: string,
  slug: string,
): Promise<ProductCategory | undefined> {
  const db = await getDb();
  return db.query.productCategories.findFirst({
    where: and(
      eq(productCategories.storeId, storeId),
      eq(productCategories.slug, slug),
    ),
  });
}

export async function createProductCategory(
  userId: string,
  storeId: string,
  input: ProductCategoryInput,
): Promise<ProductCategory> {
  const db = await getDb();
  const now = new Date().toISOString();
  const existingCategories = await listProductCategories(userId, storeId);
  const category: ProductCategory = {
    id: uid(),
    userId,
    storeId,
    name: input.name.trim(),
    slug: slugify(input.slug),
    description: input.description?.trim() || "",
    sortOrder:
      Math.max(-1, ...existingCategories.map((category) => category.sortOrder)) +
      1,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(productCategories).values(category);
  return category;
}

export async function reorderProductCategories(
  userId: string,
  storeId: string,
  categoryIds: string[],
): Promise<void> {
  const categories = await listProductCategories(userId, storeId);
  const expectedIds = new Set(categories.map((category) => category.id));
  if (
    categoryIds.length !== expectedIds.size ||
    categoryIds.some((id) => !expectedIds.has(id))
  ) {
    throw new Error("Invalid category order");
  }
  const db = await getDb();
  await Promise.all(
    categoryIds.map((id, sortOrder) =>
      db
        .update(productCategories)
        .set({ sortOrder, updatedAt: new Date().toISOString() })
        .where(
          and(
            eq(productCategories.id, id),
            eq(productCategories.userId, userId),
            eq(productCategories.storeId, storeId),
          ),
        ),
    ),
  );
}

export async function validateProductCategoryIds(
  userId: string,
  storeId: string,
  categoryIds: string[],
): Promise<boolean> {
  const uniqueIds = [...new Set(categoryIds)];
  if (!uniqueIds.length) return true;
  const db = await getDb();
  const categories = await db.query.productCategories.findMany({
    columns: { id: true },
    where: and(
      eq(productCategories.userId, userId),
      eq(productCategories.storeId, storeId),
      inArray(productCategories.id, uniqueIds),
    ),
  });
  return categories.length === uniqueIds.length;
}

export async function updateProductCategory(
  category: ProductCategory,
  input: ProductCategoryInput,
): Promise<ProductCategory | undefined> {
  const db = await getDb();
  const updated = await db
    .update(productCategories)
    .set({
      name: input.name.trim(),
      slug: slugify(input.slug),
      description: input.description?.trim() || "",
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(productCategories.id, category.id),
        eq(productCategories.userId, category.userId),
      ),
    )
    .returning();
  return updated[0];
}

export async function deleteProductCategory(
  category: ProductCategory,
): Promise<void> {
  const db = await getDb();
  await db
    .delete(productCategories)
    .where(
      and(
        eq(productCategories.id, category.id),
        eq(productCategories.userId, category.userId),
      ),
    );
}
