import "server-only";

import { and, asc, eq } from "drizzle-orm";
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
    currency: row.currency,
    transactionFeeType: row.transactionFeeType,
    transactionFeeValue: row.transactionFeeValue,
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
      ? and(eq(stores.id, storeId), eq(stores.userId, userId))
      : eq(stores.id, storeId),
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
    where: eq(stores.userId, userId),
    orderBy: [asc(stores.createdAt)],
  });
  return row ? rowToStore(row) : undefined;
}

export async function getPrimaryStore(): Promise<Store | undefined> {
  const db = await getDb();
  const primaryUser = await db.query.users.findFirst({
    orderBy: [asc(users.createdAt)],
  });
  if (primaryUser?.activeStoreId) {
    const activeStore = await getStoreById(
      primaryUser.activeStoreId,
      primaryUser.id,
    );
    if (activeStore) return activeStore;
  }
  const row = await db.query.stores.findFirst({
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
    where: eq(stores.slug, slug),
  });
  return row ? rowToStore(row) : undefined;
}

export async function createStore(
  input: CreateStoreInput
): Promise<Store> {
  const db = await getDb();
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
    currency: "USD",
    transactionFeeType: "fixed",
    transactionFeeValue: 0,
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

export async function updateStore(
  storeId: string,
  userId: string,
  input: UpdateStoreInput
): Promise<Store | undefined> {
  const db = await getDb();
  await db
    .update(stores)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
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
  if (input.name !== undefined) {
    await db
      .update(users)
      .set({ storeName: input.name })
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
