import "server-only";

import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import packageJson from "../../package.json";
import { getDb } from "@/db";
import {
  checkoutReminders,
  customerAccounts,
  featureRecords,
  orders,
  products,
  stores,
} from "@/db/schema";
import type { StoreBackupFile } from "./store-backup.types";
import { selectStoreBackupFeatureRows } from "./store-backup-scope.utils";

export async function exportStoreBackup(
  userId: string,
  storeId: string,
): Promise<StoreBackupFile> {
  const db = await getDb();
  const [storeRow, productRows, orderRows, reminderRows, allFeatureRows] =
    await Promise.all([
      db.query.stores.findFirst({
        where: and(eq(stores.id, storeId), eq(stores.userId, userId)),
      }),
      db.query.products.findMany({
        where: and(
          eq(products.userId, userId),
          storeId === userId
            ? or(eq(products.storeId, storeId), isNull(products.storeId))
            : eq(products.storeId, storeId),
        ),
        orderBy: [asc(products.createdAt)],
      }),
      db.query.orders.findMany({
        where: and(
          eq(orders.userId, userId),
          storeId === userId
            ? or(eq(orders.storeId, storeId), isNull(orders.storeId))
            : eq(orders.storeId, storeId),
        ),
        orderBy: [asc(orders.createdAt)],
      }),
      db.query.checkoutReminders.findMany({
        where: and(
          eq(checkoutReminders.userId, userId),
          eq(checkoutReminders.storeId, storeId),
        ),
        orderBy: [asc(checkoutReminders.createdAt)],
      }),
      db.query.featureRecords.findMany({
        where: eq(featureRecords.userId, userId),
        orderBy: [asc(featureRecords.createdAt)],
      }),
    ]);
  if (!storeRow) throw new Error("Current store was not found");
  const productIds = new Set(productRows.map((product) => product.id));
  const orderIds = new Set(orderRows.map((order) => order.id));
  const customerEmails = new Set(
    orderRows.map((order) => order.customerEmail.trim().toLowerCase()),
  );
  const featureRows = selectStoreBackupFeatureRows(
    allFeatureRows,
    storeId,
    productIds,
    orderIds,
    customerEmails,
  );
  const customers = customerEmails.size
    ? await db.query.customerAccounts.findMany({
        where: inArray(
          customerAccounts.email,
          [...customerEmails],
        ),
      })
    : [];

  return {
    format: "paymug-store-backup",
    version: 2,
    appVersion: packageJson.version,
    exportedAt: new Date().toISOString(),
    sourceStoreId: storeRow.id,
    sourceStoreSlug: storeRow.slug,
    data: {
      products: productRows.map(({ userId: _userId, ...product }) => product),
      orders: orderRows.map(({ userId: _userId, ...order }) => order),
      checkoutReminders: reminderRows.map(
        ({ userId: _userId, ...reminder }) => reminder,
      ),
      featureRecords: featureRows.map(
        ({ userId: _userId, ...feature }) => feature,
      ),
      customers,
    },
  };
}
