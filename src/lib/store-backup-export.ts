import "server-only";

import { asc, eq } from "drizzle-orm";
import packageJson from "../../package.json";
import { getDb } from "@/db";
import {
  checkoutReminders,
  featureRecords,
  orders,
  products,
  stores,
} from "@/db/schema";
import type { StoreBackupFile } from "./store-backup.types";

export async function exportStoreBackup(userId: string): Promise<StoreBackupFile> {
  const db = await getDb();
  const [storeRows, productRows, orderRows, reminderRows, featureRows, customers] =
    await Promise.all([
      db.query.stores.findMany({
        where: eq(stores.userId, userId),
        orderBy: [asc(stores.createdAt)],
      }),
      db.query.products.findMany({
        where: eq(products.userId, userId),
        orderBy: [asc(products.createdAt)],
      }),
      db.query.orders.findMany({
        where: eq(orders.userId, userId),
        orderBy: [asc(orders.createdAt)],
      }),
      db.query.checkoutReminders.findMany({
        where: eq(checkoutReminders.userId, userId),
        orderBy: [asc(checkoutReminders.createdAt)],
      }),
      db.query.featureRecords.findMany({
        where: eq(featureRecords.userId, userId),
        orderBy: [asc(featureRecords.createdAt)],
      }),
      db.query.customerAccounts.findMany(),
    ]);

  return {
    format: "paymug-store-backup",
    version: 1,
    appVersion: packageJson.version,
    exportedAt: new Date().toISOString(),
    data: {
      stores: storeRows.map(({ userId: _userId, ...store }) => store),
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
