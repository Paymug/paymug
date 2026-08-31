import "server-only";

import { and, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { getDb } from "@/db";
import {
  checkoutReminders,
  customerAccounts,
  featureRecords,
  orders,
  products,
  stores,
} from "@/db/schema";
import type {
  StoreBackupFile,
  StoreBackupImportOptions,
  StoreBackupImportResult,
} from "./store-backup.types";
import {
  createImportedSlug,
  createStoreBackupIdMap,
  remapStoreBackupData,
  replaceStoreBackupUrlReferences,
} from "./store-backup.utils";
import { uid } from "./utils";

export async function importStoreBackup(
  userId: string,
  currentStoreId: string,
  backup: StoreBackupFile,
  options: StoreBackupImportOptions,
): Promise<StoreBackupImportResult> {
  const db = await getDb();
  const [
    currentStore,
    existingProducts,
    existingOrders,
    existingFeatures,
    existingCustomers,
    existingReminders,
  ] =
    await Promise.all([
      db.query.stores.findFirst({
        columns: { id: true, slug: true },
        where: and(eq(stores.id, currentStoreId), eq(stores.userId, userId)),
      }),
      db.query.products.findMany({ columns: { id: true, slug: true, storeId: true } }),
      db.query.orders.findMany({ columns: { id: true, storeId: true } }),
      db.query.featureRecords.findMany({ columns: { id: true, data: true } }),
      db.query.customerAccounts.findMany({ columns: { id: true, email: true } }),
      db.query.checkoutReminders.findMany({
        columns: {
          id: true,
          storeId: true,
          productId: true,
          environment: true,
          customerEmail: true,
        },
      }),
    ]);
  if (!currentStore) throw new Error("Current store was not found");
  const legacySourceStore = backup.data.stores?.[0];
  const sourceStoreId = backup.sourceStoreId || legacySourceStore?.id;
  const sourceStoreSlug = backup.sourceStoreSlug || legacySourceStore?.slug;
  const productIds = createStoreBackupIdMap(
    backup.data.products.map((product) => product.id),
    options.preserveIds,
  );
  const orderIds = createStoreBackupIdMap(
    backup.data.orders.map((order) => order.id),
    options.preserveIds,
  );
  const reminderIds = createStoreBackupIdMap(
    backup.data.checkoutReminders.map((reminder) => reminder.id),
    options.preserveIds,
  );
  const featureIds = createStoreBackupIdMap(
    backup.data.featureRecords.map((feature) => feature.id),
    options.preserveIds,
  );
  if (options.preserveIds) {
    for (const product of backup.data.products) {
      const existing = existingProducts.find((candidate) => candidate.id === product.id);
      if (existing && existing.storeId !== currentStoreId) {
        throw new Error(`Product ID ${product.id} belongs to another store`);
      }
    }
    for (const order of backup.data.orders) {
      const existing = existingOrders.find((candidate) => candidate.id === order.id);
      if (existing && existing.storeId !== currentStoreId) {
        throw new Error(`Order ID ${order.id} belongs to another store`);
      }
    }
    for (const reminder of backup.data.checkoutReminders) {
      const existing = existingReminders.find((candidate) => candidate.id === reminder.id);
      if (existing && existing.storeId !== currentStoreId) {
        throw new Error(`Checkout reminder ID ${reminder.id} belongs to another store`);
      }
    }
    for (const feature of backup.data.featureRecords) {
      const existing = existingFeatures.find((candidate) => candidate.id === feature.id);
      if (!existing) continue;
      let existingStoreId: unknown;
      try {
        const data = JSON.parse(existing.data) as Record<string, unknown>;
        existingStoreId = data.storeId;
      } catch {
        // Invalid legacy data has no reliable store owner.
      }
      if (typeof existingStoreId === "string" && existingStoreId !== currentStoreId) {
        throw new Error(`Feature record ID ${feature.id} belongs to another store`);
      }
    }
  }
  const existingCustomersByEmail = new Map(
    existingCustomers.map((customer) => [customer.email.toLowerCase(), customer]),
  );
  const customerIds = new Map<string, string>();
  let reusedCustomers = 0;
  for (const customer of backup.data.customers) {
    const existing = existingCustomersByEmail.get(customer.email.toLowerCase());
    if (options.preserveIds && existing && existing.id !== customer.id) {
      throw new Error(`Customer email ${customer.email} already belongs to another ID`);
    }
    if (!options.preserveIds && existing) {
      customerIds.set(customer.id, existing.id);
      reusedCustomers += 1;
    } else {
      customerIds.set(customer.id, options.preserveIds ? customer.id : uid());
    }
  }

  const existingProductSlugOwners = new Map(
    existingProducts.map((product) => [product.slug, product.id]),
  );
  const usedProductSlugs = new Set(existingProductSlugOwners.keys());
  const productSlugs = new Map<string, string>();
  for (const product of backup.data.products) {
    const owner = existingProductSlugOwners.get(product.slug);
    if (options.preserveIds && product.slug && owner && owner !== product.id) {
      throw new Error(`Product slug ${product.slug} is already in use`);
    }
    productSlugs.set(
      product.id,
      options.preserveIds
        ? product.slug
        : createImportedSlug(
            product.slug || "product",
            productIds.get(product.id)!,
            usedProductSlugs,
          ),
    );
  }

  const textReplacements = new Map<string, string>();
  if (sourceStoreId) textReplacements.set(sourceStoreId, currentStoreId);
  if (sourceStoreSlug) textReplacements.set(sourceStoreSlug, currentStore.slug);
  if (!options.preserveIds) {
    for (const product of backup.data.products) {
      textReplacements.set(product.id, productSlugs.get(product.id)!);
      if (product.slug) textReplacements.set(product.slug, productSlugs.get(product.id)!);
    }
    for (const order of backup.data.orders) {
      textReplacements.set(order.id, orderIds.get(order.id)!);
    }
  }

  const importedProducts = backup.data.products.map((source) => {
    return {
      ...source,
      id: productIds.get(source.id)!,
      userId,
      storeId: currentStoreId,
      categoryId: null,
      environment: options.environment,
      slug: productSlugs.get(source.id)!,
    };
  });
  const importedOrders = backup.data.orders.map((source) => {
    const productId = productIds.get(source.productId);
    if (!productId) throw new Error(`Order ${source.id} references a missing product`);
    return {
      ...source,
      id: orderIds.get(source.id)!,
      userId,
      storeId: currentStoreId,
      environment: options.environment,
      productId,
      affiliateId: source.affiliateId
        ? featureIds.get(source.affiliateId) || null
        : null,
    };
  });
  const importedReminders = backup.data.checkoutReminders.map((source) => {
    const productId = productIds.get(source.productId);
    if (!productId) {
      throw new Error(`Checkout reminder ${source.id} has a missing product`);
    }
    return {
      ...source,
      id: reminderIds.get(source.id)!,
      userId,
      storeId: currentStoreId,
      environment: options.environment,
      productId,
      checkoutUrl: replaceStoreBackupUrlReferences(source.checkoutUrl, textReplacements),
    };
  });
  const importedFeatures = backup.data.featureRecords.map((source) => {
    let data = source.data;
    try {
      const remapped = remapStoreBackupData(
        JSON.parse(source.data),
        currentStoreId,
        options.environment,
        {
          products: productIds,
          orders: orderIds,
          features: featureIds,
          customers: customerIds,
        },
      );
      if (!remapped || typeof remapped !== "object" || Array.isArray(remapped)) {
        throw new Error("Feature data must be an object");
      }
      data = replaceStoreBackupUrlReferences(
        JSON.stringify({
          ...remapped,
          storeId: currentStoreId,
          environment: options.environment,
        }),
        textReplacements,
      );
    } catch {
      throw new Error(`Feature record ${source.id} contains invalid data`);
    }
    return {
      ...source,
      id: featureIds.get(source.id)!,
      userId,
      environment: options.environment,
      subtitle: source.subtitle
        ? replaceStoreBackupUrlReferences(source.subtitle, textReplacements)
        : null,
      data,
    };
  });
  const importedCustomers = backup.data.customers
    .filter((source) => options.preserveIds || !existingCustomersByEmail.has(source.email.toLowerCase()))
    .map((source) => ({ ...source, id: customerIds.get(source.id)! }));

  if (options.preserveIds) {
    const existingReminderOwners = new Map(
      existingReminders.map((reminder) => [
        `${reminder.storeId}|${reminder.productId}|${reminder.environment}|${reminder.customerEmail.toLowerCase()}`,
        reminder.id,
      ]),
    );
    for (const reminder of importedReminders) {
      const key = `${reminder.storeId}|${reminder.productId}|${reminder.environment}|${reminder.customerEmail.toLowerCase()}`;
      const owner = existingReminderOwners.get(key);
      if (owner && owner !== reminder.id) {
        throw new Error(`A checkout reminder for ${reminder.customerEmail} already exists`);
      }
    }
  }

  const statements: BatchItem<"sqlite">[] = [];
  for (const row of importedProducts) {
    const { id: _id, ...set } = row;
    const statement = db.insert(products).values(row);
    statements.push(
      options.preserveIds
        ? statement.onConflictDoUpdate({ target: products.id, set })
        : statement,
    );
  }
  for (const row of importedCustomers) {
    const { id: _id, ...set } = row;
    const statement = db.insert(customerAccounts).values(row);
    statements.push(
      options.preserveIds
        ? statement.onConflictDoUpdate({ target: customerAccounts.id, set })
        : statement,
    );
  }
  for (const row of importedOrders) {
    const { id: _id, ...set } = row;
    const statement = db.insert(orders).values(row);
    statements.push(
      options.preserveIds
        ? statement.onConflictDoUpdate({ target: orders.id, set })
        : statement,
    );
  }
  for (const row of importedReminders) {
    const { id: _id, ...set } = row;
    const statement = db.insert(checkoutReminders).values(row);
    statements.push(
      options.preserveIds
        ? statement.onConflictDoUpdate({ target: checkoutReminders.id, set })
        : statement,
    );
  }
  for (const row of importedFeatures) {
    const { id: _id, ...set } = row;
    const statement = db.insert(featureRecords).values(row);
    statements.push(
      options.preserveIds
        ? statement.onConflictDoUpdate({ target: featureRecords.id, set })
        : statement,
    );
  }
  if (statements.length) {
    await db.batch(
      statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]],
    );
  }

  return {
    preserveIds: options.preserveIds,
    products: importedProducts.length,
    orders: importedOrders.length,
    checkoutReminders: importedReminders.length,
    featureRecords: importedFeatures.length,
    customers: importedCustomers.length,
    reusedCustomers,
  };
}
