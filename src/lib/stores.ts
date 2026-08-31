import "server-only";

import { and, asc, eq, ne } from "drizzle-orm";
import { stores, users } from "@/db/schema";
import { getDb } from "@/db";
import type { Store } from "./types";
import type {
  CreateStoreInput,
  StoreCredentialKind,
  UpdateStoreInput,
} from "./stores.types";
import { uid } from "./utils";
import { slugify } from "./format";

function rowToStore(row: typeof stores.$inferSelect): Store {
  const emailFrom =
    row.emailFrom === "email_from" ? null : row.emailFrom;
  const emailReplyTo =
    row.emailReplyTo === "email_reply_to" ? null : row.emailReplyTo;
  const paymentCredentialSourceStoreId =
    row.paymentCredentialSourceStoreId ===
    "payment_credential_source_store_id"
      ? row.id
      : row.paymentCredentialSourceStoreId;
  const githubCredentialSourceStoreId =
    row.githubCredentialSourceStoreId ===
    "github_credential_source_store_id"
      ? row.id
      : row.githubCredentialSourceStoreId;
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    logoImageUrl: row.logoImageUrl ?? undefined,
    coverImageUrl: row.coverImageUrl ?? undefined,
    emailFrom: emailFrom ?? undefined,
    emailReplyTo: emailReplyTo ?? undefined,
    paymentCredentialSourceStoreId:
      paymentCredentialSourceStoreId ?? undefined,
    paymentGateway: row.paymentGateway,
    githubCredentialSourceStoreId:
      githubCredentialSourceStoreId ?? undefined,
    affiliatesEnabled: row.affiliatesEnabled,
    affiliateCommissionType: row.affiliateCommissionType,
    affiliateCommissionValue: row.affiliateCommissionValue,
    affiliateCommissionDuration: row.affiliateCommissionDuration,
    affiliateAttributionModel: row.affiliateAttributionModel,
    emailCampaignsEnabled: row.emailCampaignsEnabled,
    abandonedCheckoutRemindersEnabled:
      row.abandonedCheckoutRemindersEnabled,
    analyticsEnabled: row.analyticsEnabled,
    displayPurchasesEnabled: row.displayPurchasesEnabled,
    currency: row.currency,
    transactionFeeType: row.transactionFeeType,
    transactionFeeValue: row.transactionFeeValue,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getStoreById(
  storeId: string,
  userId?: string
): Promise<Store | undefined> {
  const db = await getDb();
  const row = await db.query.stores.findFirst({
    where: userId
      ? and(
          eq(stores.id, storeId),
          eq(stores.userId, userId),
          eq(stores.isActive, true),
        )
      : and(eq(stores.id, storeId), eq(stores.isActive, true)),
  });
  return row ? rowToStore(row) : undefined;
}

export async function getActiveStoreForUser(
  userId: string,
  activeStoreId?: string | null
): Promise<Store | undefined> {
  if (activeStoreId) {
    const activeStore = await getStoreById(activeStoreId, userId);
    if (activeStore) return activeStore;
  }
  const db = await getDb();
  const row = await db.query.stores.findFirst({
    where: and(eq(stores.userId, userId), eq(stores.isActive, true)),
    orderBy: [asc(stores.createdAt)],
  });
  return row ? rowToStore(row) : undefined;
}

export async function getPrimaryStore(): Promise<Store | undefined> {
  const db = await getDb();
  const primaryUser = await db.query.users.findFirst({
    orderBy: [asc(users.createdAt)],
  });
  const primaryStoreId =
    primaryUser?.primaryStoreId || primaryUser?.activeStoreId;
  if (primaryUser && primaryStoreId) {
    const activeStore = await getStoreById(
      primaryStoreId,
      primaryUser.id,
    );
    if (activeStore) return activeStore;
  }
  const row = await db.query.stores.findFirst({
    where: eq(stores.isActive, true),
    orderBy: [asc(stores.createdAt)],
  });
  return row ? rowToStore(row) : undefined;
}

export async function listStoresByUser(userId: string): Promise<Store[]> {
  const db = await getDb();
  const rows = await db.query.stores.findMany({
    where: eq(stores.userId, userId),
    orderBy: [asc(stores.createdAt)],
  });
  return rows.map(rowToStore);
}

export async function getStoreBySlug(
  slug: string
): Promise<Store | undefined> {
  const db = await getDb();
  const row = await db.query.stores.findFirst({
    where: and(eq(stores.slug, slug), eq(stores.isActive, true)),
  });
  return row ? rowToStore(row) : undefined;
}

export async function createStore(
  input: CreateStoreInput
): Promise<Store> {
  const db = await getDb();
  const owner = await db.query.users.findFirst({
    columns: { primaryStoreId: true },
    where: eq(users.id, input.userId),
  });
  const now = new Date().toISOString();
  const storeId = uid();
  const storeSlug = `${slugify(input.name) || "store"}-${storeId.slice(0, 6)}`;
  const store: Store = {
    id: storeId,
    userId: input.userId,
    name: input.name,
    slug: storeSlug,
    description: input.description || "",
    logoImageUrl: input.logoImageUrl,
    coverImageUrl: input.coverImageUrl,
    paymentCredentialSourceStoreId: undefined,
    paymentGateway: "paypal",
    githubCredentialSourceStoreId: undefined,
    affiliatesEnabled: true,
    affiliateCommissionType: "percentage",
    affiliateCommissionValue: 10,
    affiliateCommissionDuration: "one_time",
    affiliateAttributionModel: "last_click",
    emailCampaignsEnabled: true,
    abandonedCheckoutRemindersEnabled: false,
    analyticsEnabled: false,
    displayPurchasesEnabled: false,
    currency: "USD",
    transactionFeeType: "fixed",
    transactionFeeValue: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(stores).values({
    ...store,
    logoImageUrl: store.logoImageUrl ?? null,
    coverImageUrl: store.coverImageUrl ?? null,
    emailFrom: null,
    emailReplyTo: null,
    paymentCredentialSourceStoreId:
      store.paymentCredentialSourceStoreId ?? null,
    githubCredentialSourceStoreId:
      store.githubCredentialSourceStoreId ?? null,
  });
  await db
    .update(users)
    .set({
      activeStoreId: store.id,
      primaryStoreId: owner?.primaryStoreId || store.id,
      storeName: store.name,
      storeSlug: store.slug,
    })
    .where(eq(users.id, input.userId));
  return store;
}

export async function activateStore(
  storeId: string,
  userId: string,
): Promise<Store | undefined> {
  const db = await getDb();
  const store = await getStoreById(storeId, userId);
  if (!store) return undefined;
  await db
    .update(users)
    .set({
      activeStoreId: store.id,
      storeName: store.name,
      storeSlug: store.slug,
    })
    .where(eq(users.id, userId));
  return store;
}

export async function deactivateStore(
  storeId: string,
  userId: string,
): Promise<Store | undefined> {
  const db = await getDb();
  const store = await getStoreById(storeId, userId);
  if (!store) return undefined;
  const replacementRow = await db.query.stores.findFirst({
    where: and(
      eq(stores.userId, userId),
      eq(stores.isActive, true),
      ne(stores.id, storeId),
    ),
    orderBy: [asc(stores.createdAt)],
  });
  if (!replacementRow) {
    throw new Error("Create or reactivate another store before deactivating this one");
  }
  const owner = await db.query.users.findFirst({
    columns: { primaryStoreId: true },
    where: eq(users.id, userId),
  });
  const replacement = rowToStore(replacementRow);
  await db
    .update(stores)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(and(eq(stores.id, storeId), eq(stores.userId, userId)));
  await db
    .update(users)
    .set({
      activeStoreId: replacement.id,
      ...(owner?.primaryStoreId === storeId
        ? { primaryStoreId: replacement.id }
        : {}),
      storeName: replacement.name,
      storeSlug: replacement.slug,
    })
    .where(eq(users.id, userId));
  return replacement;
}

export async function reactivateStore(
  storeId: string,
  userId: string,
): Promise<Store | undefined> {
  const db = await getDb();
  const updated = await db
    .update(stores)
    .set({ isActive: true, updatedAt: new Date().toISOString() })
    .where(and(eq(stores.id, storeId), eq(stores.userId, userId)))
    .returning();
  return updated[0] ? rowToStore(updated[0]) : undefined;
}

export async function setPrimaryStore(
  storeId: string,
  userId: string,
): Promise<Store | undefined> {
  const db = await getDb();
  const store = await getStoreById(storeId, userId);
  if (!store) return undefined;
  await db
    .update(users)
    .set({ primaryStoreId: store.id })
    .where(eq(users.id, userId));
  return store;
}

export async function updateStore(
  storeId: string,
  userId: string,
  input: UpdateStoreInput
): Promise<Store | undefined> {
  const db = await getDb();
  const slug = input.slug === undefined ? undefined : slugify(input.slug);
  if (input.slug !== undefined && !slug) {
    throw new Error("Enter a valid store slug");
  }
  if (slug !== undefined) {
    const existingStore = await getStoreBySlug(slug);
    if (existingStore && existingStore.id !== storeId) {
      throw new Error("Store slug already taken");
    }
  }
  await db
    .update(stores)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(slug !== undefined ? { slug } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.logoImageUrl !== undefined
        ? { logoImageUrl: input.logoImageUrl }
        : {}),
      ...(input.coverImageUrl !== undefined
        ? { coverImageUrl: input.coverImageUrl }
        : {}),
      ...(input.emailFrom !== undefined
        ? { emailFrom: input.emailFrom }
        : {}),
      ...(input.emailReplyTo !== undefined
        ? { emailReplyTo: input.emailReplyTo }
        : {}),
      ...(input.paymentGateway !== undefined
        ? { paymentGateway: input.paymentGateway }
        : {}),
      ...(input.affiliatesEnabled !== undefined
        ? { affiliatesEnabled: input.affiliatesEnabled }
        : {}),
      ...(input.affiliateCommissionType !== undefined
        ? { affiliateCommissionType: input.affiliateCommissionType }
        : {}),
      ...(input.affiliateCommissionValue !== undefined
        ? { affiliateCommissionValue: input.affiliateCommissionValue }
        : {}),
      ...(input.affiliateCommissionDuration !== undefined
        ? { affiliateCommissionDuration: input.affiliateCommissionDuration }
        : {}),
      ...(input.affiliateAttributionModel !== undefined
        ? { affiliateAttributionModel: input.affiliateAttributionModel }
        : {}),
      ...(input.emailCampaignsEnabled !== undefined
        ? { emailCampaignsEnabled: input.emailCampaignsEnabled }
        : {}),
      ...(input.abandonedCheckoutRemindersEnabled !== undefined
        ? {
            abandonedCheckoutRemindersEnabled:
              input.abandonedCheckoutRemindersEnabled,
          }
        : {}),
      ...(input.analyticsEnabled !== undefined
        ? { analyticsEnabled: input.analyticsEnabled }
        : {}),
      ...(input.displayPurchasesEnabled !== undefined
        ? { displayPurchasesEnabled: input.displayPurchasesEnabled }
        : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.transactionFeeType !== undefined
        ? { transactionFeeType: input.transactionFeeType }
        : {}),
      ...(input.transactionFeeValue !== undefined
        ? { transactionFeeValue: input.transactionFeeValue }
        : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(stores.id, storeId), eq(stores.userId, userId)));
  if (input.name !== undefined || slug !== undefined) {
    await db
      .update(users)
      .set({
        ...(input.name !== undefined ? { storeName: input.name } : {}),
        ...(slug !== undefined ? { storeSlug: slug } : {}),
      })
      .where(
        and(eq(users.id, userId), eq(users.activeStoreId, storeId)),
      );
  }
  return getStoreById(storeId, userId);
}

export async function getStoreCredentialSource(
  userId: string,
  storeId: string,
  kind: StoreCredentialKind
): Promise<string | undefined> {
  const store = await getStoreById(storeId, userId);
  if (!store) return undefined;
  return kind === "payment"
    ? store.paymentCredentialSourceStoreId
    : store.githubCredentialSourceStoreId;
}

export async function enableStoreCredential(
  userId: string,
  storeId: string,
  kind: StoreCredentialKind
): Promise<void> {
  const db = await getDb();
  await db
    .update(stores)
    .set(
      kind === "payment"
        ? { paymentCredentialSourceStoreId: storeId }
        : { githubCredentialSourceStoreId: storeId }
    )
    .where(and(eq(stores.id, storeId), eq(stores.userId, userId)));
}
