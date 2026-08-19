import "server-only";

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
  backup: StoreBackupFile,
  options: StoreBackupImportOptions,
): Promise<StoreBackupImportResult> {
  const db = await getDb();
  const [existingStores, existingProducts, existingCustomers, existingReminders] =
    await Promise.all([
      db.query.stores.findMany({ columns: { id: true, slug: true } }),
      db.query.products.findMany({ columns: { id: true, slug: true } }),
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
  const storeIds = createStoreBackupIdMap(
    backup.data.stores.map((store) => store.id),
    options.preserveIds,
  );
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

  const existingStoreSlugOwners = new Map(
    existingStores.map((store) => [store.slug, store.id]),
  );
  const existingProductSlugOwners = new Map(
    existingProducts.map((product) => [product.slug, product.id]),
  );
  const usedStoreSlugs = new Set(existingStoreSlugOwners.keys());
  const usedProductSlugs = new Set(existingProductSlugOwners.keys());
  const storeSlugs = new Map<string, string>();
  const productSlugs = new Map<string, string>();
  for (const store of backup.data.stores) {
    const owner = existingStoreSlugOwners.get(store.slug);
    if (options.preserveIds && owner && owner !== store.id) {
      throw new Error(`Store slug ${store.slug} is already in use`);
    }
    storeSlugs.set(
      store.id,
      options.preserveIds
        ? store.slug
        : createImportedSlug(store.slug, storeIds.get(store.id)!, usedStoreSlugs),
    );
  }
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
  if (!options.preserveIds) {
    for (const store of backup.data.stores) {
      textReplacements.set(store.id, storeIds.get(store.id)!);
      textReplacements.set(store.slug, storeSlugs.get(store.id)!);
    }
    for (const product of backup.data.products) {
      textReplacements.set(product.id, productSlugs.get(product.id)!);
      if (product.slug) textReplacements.set(product.slug, productSlugs.get(product.id)!);
    }
    for (const order of backup.data.orders) {
      textReplacements.set(order.id, orderIds.get(order.id)!);
    }
  }

  const importedStores = backup.data.stores.map((source) => ({
    ...source,
    id: storeIds.get(source.id)!,
    userId,
    slug: storeSlugs.get(source.id)!,
    paymentCredentialSourceStoreId: source.paymentCredentialSourceStoreId
      ? storeIds.get(source.paymentCredentialSourceStoreId) || null
      : null,
    githubCredentialSourceStoreId: source.githubCredentialSourceStoreId
      ? storeIds.get(source.githubCredentialSourceStoreId) || null
      : null,
  }));
  const importedProducts = backup.data.products.map((source) => {
    const storeId = source.storeId ? storeIds.get(source.storeId) : undefined;
    if (source.storeId && !storeId) throw new Error(`Product ${source.id} references a missing store`);
    return {
      ...source,
      id: productIds.get(source.id)!,
      userId,
      storeId: storeId || null,
      slug: productSlugs.get(source.id)!,
    };
  });
  const importedOrders = backup.data.orders.map((source) => {
    const productId = productIds.get(source.productId);
    const storeId = source.storeId ? storeIds.get(source.storeId) : undefined;
    if (!productId) throw new Error(`Order ${source.id} references a missing product`);
    if (source.storeId && !storeId) throw new Error(`Order ${source.id} references a missing store`);
    return {
      ...source,
      id: orderIds.get(source.id)!,
      userId,
      storeId: storeId || null,
      productId,
      affiliateId: source.affiliateId
        ? featureIds.get(source.affiliateId) || source.affiliateId
        : null,
    };
  });
  const importedReminders = backup.data.checkoutReminders.map((source) => {
    const storeId = storeIds.get(source.storeId);
    const productId = productIds.get(source.productId);
    if (!storeId || !productId) {
      throw new Error(`Checkout reminder ${source.id} has a missing store or product`);
    }
    return {
      ...source,
      id: reminderIds.get(source.id)!,
      userId,
      storeId,
      productId,
      checkoutUrl: replaceStoreBackupUrlReferences(source.checkoutUrl, textReplacements),
    };
  });
  const importedFeatures = backup.data.featureRecords.map((source) => {
    let data = source.data;
    try {
      const remapped = remapStoreBackupData(JSON.parse(source.data), {
        stores: storeIds,
        products: productIds,
        orders: orderIds,
        features: featureIds,
        customers: customerIds,
      });
      data = replaceStoreBackupUrlReferences(JSON.stringify(remapped), textReplacements);
    } catch {
      data = replaceStoreBackupUrlReferences(source.data, textReplacements);
    }
    return {
      ...source,
      id: featureIds.get(source.id)!,
      userId,
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
  for (const row of importedStores) {
    const { id: _id, ...set } = row;
    const statement = db.insert(stores).values(row);
    statements.push(
      options.preserveIds
        ? statement.onConflictDoUpdate({ target: stores.id, set })
        : statement,
    );
  }
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
    stores: importedStores.length,
    products: importedProducts.length,
    orders: importedOrders.length,
    checkoutReminders: importedReminders.length,
    featureRecords: importedFeatures.length,
    customers: importedCustomers.length,
    reusedCustomers,
  };
}
