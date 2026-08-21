import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  customerEmailPreferences,
  featureRecords,
  orders,
  stores,
} from "@/db/schema";
import type {
  CustomerEmailPreferenceCategory,
  CustomerEmailPreferencesUpdate,
  CustomerStoreEmailPreferences,
} from "./customer-email-preferences.types";
import { uid } from "./utils";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeCustomerEmailPreferenceCategory(
  value: unknown,
): CustomerEmailPreferenceCategory {
  return value === "product_updates" || value === "affiliate_updates"
    ? value
    : "marketing";
}

export async function listCustomerStoreEmailPreferences(
  email: string,
): Promise<CustomerStoreEmailPreferences[]> {
  const db = await getDb();
  const normalizedEmail = normalizeEmail(email);
  const [customerOrders, relatedRecords] = await Promise.all([
    db.query.orders.findMany({
      columns: { storeId: true },
      where: sql`lower(${orders.customerEmail}) = ${normalizedEmail}`,
    }),
    db.query.featureRecords.findMany({
      columns: { feature: true, title: true, data: true },
      where: sql`(
        (${featureRecords.feature} = 'subscriptions' AND lower(${featureRecords.subtitle}) = ${normalizedEmail})
        OR (${featureRecords.feature} = 'subscribers' AND lower(${featureRecords.title}) = ${normalizedEmail})
      )`,
    }),
  ]);
  const storeIds = new Set<string>(
    customerOrders
      .map((order) => order.storeId)
      .filter((storeId): storeId is string => Boolean(storeId)),
  );
  for (const record of relatedRecords) {
    try {
      const data = JSON.parse(record.data) as { storeId?: string };
      if (data.storeId) storeIds.add(data.storeId);
    } catch {
      continue;
    }
  }
  if (storeIds.size === 0) return [];
  const ids = [...storeIds];
  const [storeRows, preferenceRows] = await Promise.all([
    db.query.stores.findMany({ where: inArray(stores.id, ids) }),
    db.query.customerEmailPreferences.findMany({
      where: and(
        inArray(customerEmailPreferences.storeId, ids),
        sql`lower(${customerEmailPreferences.email}) = ${normalizedEmail}`,
      ),
    }),
  ]);
  const preferencesByStore = new Map(
    preferenceRows.map((preference) => [preference.storeId, preference]),
  );
  return storeRows.map((store) => {
    const preference = preferencesByStore.get(store.id);
    return {
      storeId: store.id,
      storeName: store.name,
      storeLogoImageUrl: store.logoImageUrl ?? undefined,
      marketingEnabled: preference?.marketingEnabled ?? true,
      productUpdatesEnabled: preference?.productUpdatesEnabled ?? true,
      affiliateUpdatesEnabled: preference?.affiliateUpdatesEnabled ?? true,
    };
  });
}

export async function updateCustomerStoreEmailPreferences(
  email: string,
  input: CustomerEmailPreferencesUpdate,
): Promise<void> {
  const db = await getDb();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date().toISOString();
  await db
    .insert(customerEmailPreferences)
    .values({
      id: uid(),
      storeId: input.storeId,
      email: normalizedEmail,
      marketingEnabled: input.marketingEnabled,
      productUpdatesEnabled: input.productUpdatesEnabled,
      affiliateUpdatesEnabled: input.affiliateUpdatesEnabled,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [customerEmailPreferences.storeId, customerEmailPreferences.email],
      set: {
        marketingEnabled: input.marketingEnabled,
        productUpdatesEnabled: input.productUpdatesEnabled,
        affiliateUpdatesEnabled: input.affiliateUpdatesEnabled,
        updatedAt: now,
      },
    });
}

export async function disableCustomerEmailCategory(
  email: string,
  storeId: string,
  category: CustomerEmailPreferenceCategory,
): Promise<void> {
  const db = await getDb();
  const normalizedEmail = normalizeEmail(email);
  const current = await db.query.customerEmailPreferences.findFirst({
    where: and(
      eq(customerEmailPreferences.storeId, storeId),
      eq(customerEmailPreferences.email, normalizedEmail),
    ),
  });
  await updateCustomerStoreEmailPreferences(email, {
    storeId,
    marketingEnabled:
      category === "marketing" ? false : current?.marketingEnabled ?? true,
    productUpdatesEnabled:
      category === "product_updates"
        ? false
        : current?.productUpdatesEnabled ?? true,
    affiliateUpdatesEnabled:
      category === "affiliate_updates"
        ? false
        : current?.affiliateUpdatesEnabled ?? true,
  });
}

export async function filterRecipientsByEmailPreferences<T extends { email: string }>(
  recipients: T[],
  storeId: string,
  category: CustomerEmailPreferenceCategory,
): Promise<T[]> {
  if (recipients.length === 0) return recipients;
  const db = await getDb();
  const disabledColumn =
    category === "product_updates"
      ? customerEmailPreferences.productUpdatesEnabled
      : category === "affiliate_updates"
        ? customerEmailPreferences.affiliateUpdatesEnabled
        : customerEmailPreferences.marketingEnabled;
  const disabled = await db.query.customerEmailPreferences.findMany({
    columns: { email: true },
    where: and(
      eq(customerEmailPreferences.storeId, storeId),
      eq(disabledColumn, false),
    ),
  });
  const disabledEmails = new Set(
    disabled.map((preference) => normalizeEmail(preference.email)),
  );
  return recipients.filter(
    (recipient) => !disabledEmails.has(normalizeEmail(recipient.email)),
  );
}
