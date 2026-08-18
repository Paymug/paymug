import "server-only";

import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  customerAccessTokens,
  customerAccounts,
  featureRecords,
  orders,
} from "@/db/schema";
import type { CustomerAccount } from "./customer-auth.types";
import type { CustomerProfileUpdateInput } from "./customer-accounts.types";
import { hashCustomerAccessToken } from "./customer-token.utils";
import { uid } from "./utils";

function rowToCustomerAccount(
  row: typeof customerAccounts.$inferSelect
): CustomerAccount {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? undefined,
    avatarImageUrl: row.avatarImageUrl ?? undefined,
    passwordHash: row.passwordHash ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function findCustomerByEmail(
  email: string
): Promise<CustomerAccount | undefined> {
  const db = await getDb();
  const row = await db.query.customerAccounts.findFirst({
    where: eq(customerAccounts.email, email.trim().toLowerCase()),
  });
  return row ? rowToCustomerAccount(row) : undefined;
}

export async function findCustomerById(
  id: string
): Promise<CustomerAccount | undefined> {
  const db = await getDb();
  const row = await db.query.customerAccounts.findFirst({
    where: eq(customerAccounts.id, id),
  });
  return row ? rowToCustomerAccount(row) : undefined;
}

export async function getOrCreateCustomerAccount(
  email: string
): Promise<CustomerAccount> {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await findCustomerByEmail(normalizedEmail);
  if (existing) return existing;
  const db = await getDb();
  const now = new Date().toISOString();
  const customer: CustomerAccount = {
    id: uid(),
    email: normalizedEmail,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(customerAccounts).values({
    ...customer,
    passwordHash: null,
  });
  return customer;
}

export async function customerHasPortalAccess(
  email: string
): Promise<boolean> {
  const db = await getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const [order, subscription] = await Promise.all([
    db.query.orders.findFirst({
      columns: { id: true },
      where: sql`lower(${orders.customerEmail}) = ${normalizedEmail} AND ${orders.status} IN ('paid', 'refunded')`,
    }),
    db.query.featureRecords.findFirst({
      columns: { id: true },
      where: sql`lower(${featureRecords.subtitle}) = ${normalizedEmail} AND ${featureRecords.feature} = 'subscriptions'`,
    }),
  ]);
  return Boolean(order || subscription);
}

export async function saveCustomerAccessToken(
  customerId: string,
  token: string,
  expiresAt: string
): Promise<void> {
  const db = await getDb();
  await db.insert(customerAccessTokens).values({
    id: uid(),
    customerId,
    tokenHash: hashCustomerAccessToken(token),
    expiresAt,
    createdAt: new Date().toISOString(),
  });
}

export async function consumeCustomerAccessToken(
  token: string
): Promise<CustomerAccount | undefined> {
  const db = await getDb();
  const row = await db.query.customerAccessTokens.findFirst({
    where: eq(
      customerAccessTokens.tokenHash,
      hashCustomerAccessToken(token)
    ),
  });
  if (
    !row ||
    row.usedAt ||
    new Date(row.expiresAt).getTime() <= Date.now()
  ) {
    return undefined;
  }
  await db
    .update(customerAccessTokens)
    .set({ usedAt: new Date().toISOString() })
    .where(eq(customerAccessTokens.id, row.id));
  return findCustomerById(row.customerId);
}

export async function updateCustomerPassword(
  customerId: string,
  passwordHash: string
): Promise<void> {
  const db = await getDb();
  await db
    .update(customerAccounts)
    .set({
      passwordHash,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(customerAccounts.id, customerId));
}

export async function updateCustomerProfile(
  customerId: string,
  input: CustomerProfileUpdateInput,
): Promise<void> {
  const db = await getDb();
  await db
    .update(customerAccounts)
    .set({
      name: input.name || null,
      avatarImageUrl: input.avatarImageUrl || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(customerAccounts.id, customerId));
}
