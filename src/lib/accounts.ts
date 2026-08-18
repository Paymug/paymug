import "server-only";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import type { CreateAccountInput } from "./accounts.types";
import type { User } from "./types";

export async function createAccount(
  input: CreateAccountInput
): Promise<User> {
  const db = await getDb();
  const email = input.email.toLowerCase();
  const existingAccount = await db.query.users.findFirst({
    columns: { id: true, email: true },
  });
  if (existingAccount) {
    if (existingAccount.email === email) {
      throw new Error("Email already registered");
    }
    throw new Error("This installation already has an account");
  }

  const pendingStoreSlug = `account-${input.id}`;
  await db.insert(users).values({
    id: input.id,
    email,
    name: input.name,
    passwordHash: input.passwordHash,
    storeName: "",
    storeSlug: pendingStoreSlug,
    environment: input.environment,
    activeStoreId: null,
    createdAt: input.createdAt,
  });

  return {
    ...input,
    email,
    storeName: "",
    storeSlug: pendingStoreSlug,
    activeStoreId: input.id,
  };
}
