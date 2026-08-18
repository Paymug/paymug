import "server-only";

import { inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { products, stores } from "@/db/schema";

export async function loadCustomerPortalResources(
  productIds: string[],
  storeIds: string[],
) {
  const db = await getDb();
  const uniqueProductIds = [...new Set(productIds)];
  const uniqueStoreIds = [...new Set(storeIds)];
  const [productRows, storeRows] = await Promise.all([
    uniqueProductIds.length
      ? db.query.products.findMany({
          columns: {
            id: true,
            description: true,
            imageUrl: true,
            price: true,
            deliveryContent: true,
            productFiles: true,
            githubRepoOwner: true,
            githubRepoName: true,
          },
          where: inArray(products.id, uniqueProductIds),
        })
      : Promise.resolve([]),
    uniqueStoreIds.length
      ? db.query.stores.findMany({
          columns: {
            id: true,
            name: true,
            slug: true,
            logoImageUrl: true,
            affiliatesEnabled: true,
          },
          where: inArray(stores.id, uniqueStoreIds),
        })
      : Promise.resolve([]),
  ]);

  return {
    productsById: new Map(productRows.map((product) => [product.id, product])),
    storesById: new Map(storeRows.map((store) => [store.id, store])),
  };
}
