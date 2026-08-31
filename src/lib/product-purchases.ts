import "server-only";

import { eq, sql } from "drizzle-orm";
import { products } from "@/db/schema";
import { getDb } from "@/db";

export async function incrementProductPurchaseCount(
  productId: string,
): Promise<void> {
  const db = await getDb();
  await db
    .update(products)
    .set({
      purchaseCount: sql`${products.purchaseCount} + 1`,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(products.id, productId));
}
