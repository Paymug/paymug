import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  githubConnections as githubConnectionsTable,
  orders as ordersTable,
  paypalConnections as paypalTable,
  products as productsTable,
  stripeConnections as stripeTable,
  stores as storesTable,
  users as usersTable,
} from "@/db/schema";
import type { CreateUserInput, UpdateProductInput } from "./db.types";
import type {
  GitHubConnection,
  Order,
  PayPalConnection,
  Product,
  StripeConnection,
  User,
} from "./types";
import { getStoredGitHubHostname } from "./github-hostname.utils";
import {
  parseProductFiles,
  serializeProductFiles,
} from "./product-files.utils";
import { getStoreCredentialSource } from "./stores";

function errorText(err: unknown): string {
  const parts: string[] = [];
  let cur: unknown = err;
  for (let i = 0; i < 5 && cur; i++) {
    if (cur instanceof Error) {
      parts.push(cur.message);
      cur = cur.cause;
    } else {
      parts.push(String(cur));
      break;
    }
  }
  return parts.join("\n");
}

function isUniqueViolation(err: unknown): boolean {
  const msg = errorText(err).toLowerCase();
  return (
    msg.includes("unique constraint failed") ||
    msg.includes("sqlite_constraint") ||
    (msg.includes("d1_error") && msg.includes("unique"))
  );
}

function mapUniqueError(err: unknown): never {
  const msg = errorText(err);
  if (msg.includes("users.email") || msg.includes("users_email")) {
    throw new Error("Email already registered");
  }
  if (
    msg.includes("users.store_slug") ||
    msg.includes("users_store_slug") ||
    msg.includes("stores.slug") ||
    msg.includes("stores_slug")
  ) {
    throw new Error("Store slug already taken");
  }
  // Fallback when D1 omits column name in the message
  throw new Error("Email already registered");
}

function rowToUser(row: typeof usersTable.$inferSelect): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.passwordHash,
    storeName: row.storeName,
    storeSlug: row.storeSlug,
    activeStoreId:
      row.activeStoreId && row.activeStoreId !== "active_store_id"
        ? row.activeStoreId
        : row.id,
    environment: row.environment,
    githubOAuthHostname: getStoredGitHubHostname(row.githubOAuthHostname),
    createdAt: row.createdAt,
  };
}

function rowToProduct(row: typeof productsTable.$inferSelect): Product {
  return {
    id: row.id,
    userId: row.userId,
    storeId: row.storeId || row.userId,
    environment: row.environment,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: row.price,
    transactionFeeType: row.transactionFeeType,
    transactionFeeValue: row.transactionFeeValue,
    currency: row.currency,
    status: row.status,
    imageUrl: row.imageUrl ?? undefined,
    deliveryContent: row.deliveryContent ?? undefined,
    productFiles: parseProductFiles(row.productFiles),
    generateLicense: row.generateLicense,
    licenseType: row.licenseType === "perpetual" ? "perpetual" : "standard",
    licenseUpdatePeriodUnit:
      row.licenseUpdatePeriodUnit === "day" ||
      row.licenseUpdatePeriodUnit === "week" ||
      row.licenseUpdatePeriodUnit === "month" ||
      row.licenseUpdatePeriodUnit === "year"
        ? row.licenseUpdatePeriodUnit
        : null,
    licenseUpdatePeriodCount: Math.max(1, row.licenseUpdatePeriodCount || 1),
    billingType: row.billingType === "subscription" ? "subscription" : "one_time",
    intervalUnit:
      row.intervalUnit === "week" ||
      row.intervalUnit === "month" ||
      row.intervalUnit === "year"
        ? row.intervalUnit
        : null,
    intervalCount: Math.max(1, row.intervalCount || 1),
    trialDays: Math.max(0, row.trialDays || 0),
    githubRepoOwner: row.githubRepoOwner ?? undefined,
    githubRepoName: row.githubRepoName ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rowToOrder(row: typeof ordersTable.$inferSelect): Order {
  return {
    id: row.id,
    userId: row.userId,
    storeId: row.storeId || row.userId,
    productId: row.productId,
    productName: row.productName,
    productDescription: row.productDescription ?? undefined,
    productPrice: row.productPrice ?? undefined,
    deliveryContent: row.deliveryContent ?? undefined,
    productFiles: parseProductFiles(row.productFiles),
    githubRepoOwner: row.githubRepoOwner ?? undefined,
    githubRepoName: row.githubRepoName ?? undefined,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    customerEmail: row.customerEmail,
    customerName: row.customerName ?? undefined,
    discountCode: row.discountCode ?? undefined,
    discountAmount: row.discountAmount,
    transactionFeeAmount: row.transactionFeeAmount,
    affiliateId: row.affiliateId ?? undefined,
    environment: row.environment,
    paypalOrderId: row.paypalOrderId ?? undefined,
    paypalCaptureId: row.paypalCaptureId ?? undefined,
    stripeCheckoutSessionId: row.stripeCheckoutSessionId ?? undefined,
    stripePaymentIntentId: row.stripePaymentIntentId ?? undefined,
    gateway: row.gateway,
    createdAt: row.createdAt,
    paidAt: row.paidAt ?? undefined,
    githubUsername: row.githubUsername ?? undefined,
    githubAccessStatus: row.githubAccessStatus,
    githubAccessManaged: row.githubAccessManaged,
    githubInvitationId: row.githubInvitationId || undefined,
    githubAccessError: row.githubAccessError || undefined,
    githubAccessGrantedAt: row.githubAccessGrantedAt || undefined,
    githubAccessRevokedAt: row.githubAccessRevokedAt || undefined,
  };
}

function rowToPayPal(row: typeof paypalTable.$inferSelect): PayPalConnection {
  return {
    userId: row.userId,
    clientId: row.clientId,
    clientSecretEncrypted: row.clientSecretEncrypted,
    mode: row.mode,
    merchantEmail: row.merchantEmail ?? undefined,
    webhookId: row.webhookId ?? undefined,
    webhookUrl: row.webhookUrl ?? undefined,
    webhookStatus: row.webhookStatus,
    webhookError: row.webhookError ?? undefined,
    connectedAt: row.connectedAt,
  };
}

function rowToStripe(row: typeof stripeTable.$inferSelect): StripeConnection {
  return {
    userId: row.userId,
    secretKeyEncrypted: row.secretKeyEncrypted,
    webhookSecretEncrypted: row.webhookSecretEncrypted ?? undefined,
    accountId: row.accountId,
    mode: row.mode,
    connectedAt: row.connectedAt,
  };
}

// ── Users ──────────────────────────────────────────────────────────────────

export async function createUser(user: CreateUserInput): Promise<User> {
  const db = await getDb();
  const email = user.email.toLowerCase();
  const storeId = user.activeStoreId || user.id;

  const existingAccount = await db.query.users.findFirst({
    columns: { id: true, email: true },
  });
  if (existingAccount) {
    if (existingAccount.email === email) {
      throw new Error("Email already registered");
    }
    throw new Error("This installation already has an account");
  }

  const existingSlug = await db.query.stores.findFirst({
    where: eq(storesTable.slug, user.storeSlug),
  });
  if (existingSlug) throw new Error("Store slug already taken");

  try {
    await db.insert(usersTable).values({
      id: user.id,
      email,
      name: user.name,
      passwordHash: user.passwordHash,
      storeName: user.storeName,
      storeSlug: user.storeSlug,
      environment: user.environment,
      activeStoreId: storeId,
      githubOAuthHostname: user.githubOAuthHostname ?? null,
      createdAt: user.createdAt,
    });
    await db.insert(storesTable).values({
      id: storeId,
      userId: user.id,
      name: user.storeName,
      slug: user.storeSlug,
      coverImageUrl: user.storeCoverImageUrl ?? null,
      emailFrom: null,
      emailReplyTo: null,
      paymentCredentialSourceStoreId: storeId,
      githubCredentialSourceStoreId: storeId,
      createdAt: user.createdAt,
      updatedAt: user.createdAt,
    });
  } catch (err) {
    if (isUniqueViolation(err)) mapUniqueError(err);
    throw err;
  }
  return { ...user, email, activeStoreId: storeId };
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  const row = await db.query.users.findFirst({
    where: eq(usersTable.email, email.toLowerCase()),
  });
  return row ? rowToUser(row) : undefined;
}

export async function findUserById(id: string): Promise<User | undefined> {
  const db = await getDb();
  const row = await db.query.users.findFirst({
    where: eq(usersTable.id, id),
  });
  return row ? rowToUser(row) : undefined;
}

export async function listUsers(): Promise<User[]> {
  const db = await getDb();
  const rows = await db.query.users.findMany({
    orderBy: [asc(usersTable.createdAt)],
  });
  return rows.map(rowToUser);
}

export async function findUserByStoreSlug(slug: string): Promise<User | undefined> {
  const db = await getDb();
  const store = await db.query.stores.findFirst({
    where: eq(storesTable.slug, slug),
  });
  if (!store) return undefined;
  const row = await db.query.users.findFirst({
    where: eq(usersTable.id, store.userId),
  });
  return row
    ? {
        ...rowToUser(row),
        activeStoreId: store.id,
        storeName: store.name,
        storeSlug: store.slug,
        storeCoverImageUrl: store.coverImageUrl ?? undefined,
      }
    : undefined;
}

export async function updateUser(
  id: string,
  patch: Partial<Pick<User, "name" | "storeName" | "storeSlug" | "environment">>
): Promise<User | undefined> {
  const db = await getDb();
  try {
    await db.update(usersTable).set(patch).where(eq(usersTable.id, id));
  } catch (err) {
    if (isUniqueViolation(err)) mapUniqueError(err);
    throw err;
  }
  return findUserById(id);
}

export async function updateGitHubOAuthHostname(
  userId: string,
  hostname: string
): Promise<void> {
  const db = await getDb();
  await db
    .update(usersTable)
    .set({ githubOAuthHostname: hostname })
    .where(eq(usersTable.id, userId));
}

export async function getGitHubOAuthHostname(
  userId: string
): Promise<string | undefined> {
  const db = await getDb();
  const row = await db.query.users.findFirst({
    columns: { githubOAuthHostname: true },
    where: eq(usersTable.id, userId),
  });
  return getStoredGitHubHostname(row?.githubOAuthHostname);
}

// ── Products ───────────────────────────────────────────────────────────────

export async function listProductsByUser(
  userId: string,
  storeId?: string,
  environment?: Product["environment"]
): Promise<Product[]> {
  const db = await getDb();
  const rows = await db.query.products.findMany({
    where: and(
      eq(productsTable.userId, userId),
      ...(storeId ? [eq(productsTable.storeId, storeId)] : []),
      ...(environment ? [eq(productsTable.environment, environment)] : [])
    ),
    orderBy: [desc(productsTable.createdAt)],
  });
  return rows.map(rowToProduct);
}

export async function findProductById(id: string): Promise<Product | undefined> {
  const db = await getDb();
  const row = await db.query.products.findFirst({
    where: eq(productsTable.id, id),
  });
  return row ? rowToProduct(row) : undefined;
}

export async function findPublishedProduct(
  userId: string,
  slug: string
): Promise<Product | undefined> {
  const db = await getDb();
  const row = await db.query.products.findFirst({
    where: and(
      eq(productsTable.userId, userId),
      eq(productsTable.slug, slug),
      eq(productsTable.status, "published")
    ),
  });
  return row ? rowToProduct(row) : undefined;
}

export async function createProduct(product: Product): Promise<Product> {
  const db = await getDb();
  await db.insert(productsTable).values({
    id: product.id,
    userId: product.userId,
    storeId: product.storeId,
    environment: product.environment,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    transactionFeeType: product.transactionFeeType,
    transactionFeeValue: product.transactionFeeValue,
    currency: product.currency,
    status: product.status,
    imageUrl: product.imageUrl ?? null,
    deliveryContent: product.deliveryContent ?? null,
    productFiles: serializeProductFiles(product.productFiles),
    generateLicense: product.generateLicense,
    licenseType: product.licenseType || "standard",
    licenseUpdatePeriodUnit:
      product.licenseType === "perpetual"
        ? product.licenseUpdatePeriodUnit || "year"
        : null,
    licenseUpdatePeriodCount: Math.max(1, product.licenseUpdatePeriodCount || 1),
    billingType: product.billingType || "one_time",
    intervalUnit:
      product.billingType === "subscription"
        ? product.intervalUnit || "month"
        : null,
    intervalCount: Math.max(1, product.intervalCount || 1),
    trialDays: Math.max(0, product.trialDays || 0),
    githubRepoOwner: product.githubRepoOwner ?? null,
    githubRepoName: product.githubRepoName ?? null,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  });
  return product;
}

export async function updateProduct(
  id: string,
  userId: string,
  patch: UpdateProductInput
): Promise<Product | undefined> {
  const db = await getDb();
  const existing = await db.query.products.findFirst({
    where: and(eq(productsTable.id, id), eq(productsTable.userId, userId)),
  });
  if (!existing) return undefined;

  await db
    .update(productsTable)
    .set({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.price !== undefined ? { price: patch.price } : {}),
      ...(patch.transactionFeeType !== undefined
        ? { transactionFeeType: patch.transactionFeeType }
        : {}),
      ...(patch.transactionFeeValue !== undefined
        ? { transactionFeeValue: patch.transactionFeeValue }
        : {}),
      ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.imageUrl !== undefined ? { imageUrl: patch.imageUrl ?? null } : {}),
      ...(patch.deliveryContent !== undefined
        ? { deliveryContent: patch.deliveryContent ?? null }
        : {}),
      ...(patch.productFiles !== undefined
        ? { productFiles: serializeProductFiles(patch.productFiles) }
        : {}),
      ...(patch.generateLicense !== undefined
        ? { generateLicense: patch.generateLicense }
        : {}),
      ...(patch.licenseType !== undefined
        ? { licenseType: patch.licenseType }
        : {}),
      ...(patch.licenseUpdatePeriodUnit !== undefined
        ? { licenseUpdatePeriodUnit: patch.licenseUpdatePeriodUnit ?? null }
        : {}),
      ...(patch.licenseUpdatePeriodCount !== undefined
        ? { licenseUpdatePeriodCount: Math.max(1, patch.licenseUpdatePeriodCount) }
        : {}),
      ...(patch.billingType !== undefined
        ? { billingType: patch.billingType }
        : {}),
      ...(patch.intervalUnit !== undefined
        ? { intervalUnit: patch.intervalUnit ?? null }
        : {}),
      ...(patch.intervalCount !== undefined
        ? { intervalCount: Math.max(1, patch.intervalCount) }
        : {}),
      ...(patch.trialDays !== undefined
        ? { trialDays: Math.max(0, patch.trialDays) }
        : {}),
      ...(patch.githubRepoOwner !== undefined
        ? { githubRepoOwner: patch.githubRepoOwner ?? null }
        : {}),
      ...(patch.githubRepoName !== undefined
        ? { githubRepoName: patch.githubRepoName ?? null }
        : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(productsTable.id, id), eq(productsTable.userId, userId)));

  return findProductById(id);
}

export async function deleteProduct(id: string, userId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .delete(productsTable)
    .where(and(eq(productsTable.id, id), eq(productsTable.userId, userId)))
    .returning({ id: productsTable.id });
  return result.length > 0;
}

export async function clearGitHubProductDeliveries(
  userId: string
): Promise<void> {
  const db = await getDb();
  await db
    .update(productsTable)
    .set({
      githubRepoOwner: null,
      githubRepoName: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(productsTable.userId, userId));
}

// ── Orders ─────────────────────────────────────────────────────────────────

export async function listOrdersByUser(
  userId: string,
  storeId?: string,
  environment?: Order["environment"]
): Promise<Order[]> {
  const db = await getDb();
  const rows = await db.query.orders.findMany({
    where: and(
      eq(ordersTable.userId, userId),
      ...(storeId ? [eq(ordersTable.storeId, storeId)] : []),
      ...(environment ? [eq(ordersTable.environment, environment)] : [])
    ),
    orderBy: [desc(ordersTable.createdAt)],
  });
  return rows.map(rowToOrder);
}

export async function findOrderById(id: string): Promise<Order | undefined> {
  const db = await getDb();
  const row = await db.query.orders.findFirst({
    where: eq(ordersTable.id, id),
  });
  return row ? rowToOrder(row) : undefined;
}

export async function findOrderByPaypalOrderId(
  paypalOrderId: string,
  environment?: Order["environment"]
): Promise<Order | undefined> {
  const db = await getDb();
  const row = await db.query.orders.findFirst({
    where: and(
      eq(ordersTable.paypalOrderId, paypalOrderId),
      ...(environment ? [eq(ordersTable.environment, environment)] : [])
    ),
  });
  return row ? rowToOrder(row) : undefined;
}

export async function createOrder(order: Order): Promise<Order> {
  const db = await getDb();
  await db.insert(ordersTable).values({
    id: order.id,
    userId: order.userId,
    storeId: order.storeId,
    productId: order.productId,
    productName: order.productName,
    productDescription: order.productDescription ?? null,
    productPrice: order.productPrice ?? null,
    deliveryContent: order.deliveryContent ?? null,
    productFiles: serializeProductFiles(order.productFiles),
    githubRepoOwner: order.githubRepoOwner ?? null,
    githubRepoName: order.githubRepoName ?? null,
    amount: order.amount,
    currency: order.currency,
    status: order.status,
    customerEmail: order.customerEmail,
    customerName: order.customerName ?? null,
    discountCode: order.discountCode ?? null,
    discountAmount: order.discountAmount,
    transactionFeeAmount: order.transactionFeeAmount,
    affiliateId: order.affiliateId ?? null,
    environment: order.environment,
    paypalOrderId: order.paypalOrderId ?? null,
    paypalCaptureId: order.paypalCaptureId ?? null,
    stripeCheckoutSessionId: order.stripeCheckoutSessionId ?? null,
    stripePaymentIntentId: order.stripePaymentIntentId ?? null,
    gateway: order.gateway,
    createdAt: order.createdAt,
    paidAt: order.paidAt ?? null,
    githubUsername: order.githubUsername ?? null,
    githubAccessStatus: order.githubAccessStatus,
    githubAccessManaged: order.githubAccessManaged,
    githubInvitationId: order.githubInvitationId ?? null,
    githubAccessError: order.githubAccessError ?? null,
    githubAccessGrantedAt: order.githubAccessGrantedAt ?? null,
    githubAccessRevokedAt: order.githubAccessRevokedAt ?? null,
  });
  return order;
}

export async function updateOrder(
  id: string,
  patch: Partial<Omit<Order, "id" | "userId" | "productId" | "createdAt">>
): Promise<Order | undefined> {
  const db = await getDb();
  await db
    .update(ordersTable)
    .set({
      ...(patch.productName !== undefined ? { productName: patch.productName } : {}),
      ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
      ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.customerEmail !== undefined ? { customerEmail: patch.customerEmail } : {}),
      ...(patch.customerName !== undefined ? { customerName: patch.customerName ?? null } : {}),
      ...(patch.discountCode !== undefined
        ? { discountCode: patch.discountCode ?? null }
        : {}),
      ...(patch.discountAmount !== undefined
        ? { discountAmount: patch.discountAmount }
        : {}),
      ...(patch.transactionFeeAmount !== undefined
        ? { transactionFeeAmount: patch.transactionFeeAmount }
        : {}),
      ...(patch.affiliateId !== undefined
        ? { affiliateId: patch.affiliateId ?? null }
        : {}),
      ...(patch.environment !== undefined
        ? { environment: patch.environment }
        : {}),
      ...(patch.paypalOrderId !== undefined
        ? { paypalOrderId: patch.paypalOrderId ?? null }
        : {}),
      ...(patch.paypalCaptureId !== undefined
        ? { paypalCaptureId: patch.paypalCaptureId ?? null }
        : {}),
      ...(patch.stripeCheckoutSessionId !== undefined
        ? { stripeCheckoutSessionId: patch.stripeCheckoutSessionId ?? null }
        : {}),
      ...(patch.stripePaymentIntentId !== undefined
        ? { stripePaymentIntentId: patch.stripePaymentIntentId ?? null }
        : {}),
      ...(patch.gateway !== undefined ? { gateway: patch.gateway } : {}),
      ...(patch.paidAt !== undefined ? { paidAt: patch.paidAt ?? null } : {}),
      ...(patch.githubUsername !== undefined
        ? { githubUsername: patch.githubUsername ?? null }
        : {}),
      ...(patch.githubAccessStatus !== undefined
        ? { githubAccessStatus: patch.githubAccessStatus }
        : {}),
      ...(patch.githubAccessManaged !== undefined
        ? { githubAccessManaged: patch.githubAccessManaged }
        : {}),
      ...(patch.githubInvitationId !== undefined
        ? { githubInvitationId: patch.githubInvitationId ?? null }
        : {}),
      ...(patch.githubAccessError !== undefined
        ? { githubAccessError: patch.githubAccessError ?? null }
        : {}),
      ...(patch.githubAccessGrantedAt !== undefined
        ? { githubAccessGrantedAt: patch.githubAccessGrantedAt ?? null }
        : {}),
      ...(patch.githubAccessRevokedAt !== undefined
        ? { githubAccessRevokedAt: patch.githubAccessRevokedAt ?? null }
        : {}),
    })
    .where(eq(ordersTable.id, id));
  return findOrderById(id);
}

// ── GitHub connections ────────────────────────────────────────────────────

export async function getGitHubConnection(
  userId: string,
  storeId?: string
): Promise<GitHubConnection | undefined> {
  if (
    storeId &&
    !(await getStoreCredentialSource(userId, storeId, "github"))
  ) {
    return undefined;
  }
  const db = await getDb();
  const row = await db.query.githubConnections.findFirst({
    where: eq(githubConnectionsTable.userId, userId),
  });
  return row || undefined;
}

export async function upsertGitHubConnection(
  connection: GitHubConnection
): Promise<GitHubConnection> {
  const db = await getDb();
  await db
    .insert(githubConnectionsTable)
    .values(connection)
    .onConflictDoUpdate({
      target: githubConnectionsTable.userId,
      set: {
        githubUserId: connection.githubUserId,
        login: connection.login,
        accessTokenEncrypted: connection.accessTokenEncrypted,
        scopes: connection.scopes,
        connectedAt: connection.connectedAt,
      },
    });
  return connection;
}

export async function deleteGitHubConnection(userId: string): Promise<void> {
  const db = await getDb();
  await db
    .delete(githubConnectionsTable)
    .where(eq(githubConnectionsTable.userId, userId));
}

export async function findOrderByPaypalCaptureId(
  paypalCaptureId: string,
  environment?: Order["environment"]
): Promise<Order | undefined> {
  const db = await getDb();
  const row = await db.query.orders.findFirst({
    where: and(
      eq(ordersTable.paypalCaptureId, paypalCaptureId),
      ...(environment ? [eq(ordersTable.environment, environment)] : [])
    ),
  });
  return row ? rowToOrder(row) : undefined;
}

// ── PayPal connections ─────────────────────────────────────────────────────

export async function getPayPalConnection(
  userId: string,
  mode?: PayPalConnection["mode"],
  storeId?: string
): Promise<PayPalConnection | undefined> {
  if (
    storeId &&
    !(await getStoreCredentialSource(userId, storeId, "payment"))
  ) {
    return undefined;
  }
  const db = await getDb();
  const selectedMode =
    mode ??
    (
      await db.query.users.findFirst({
        columns: { environment: true },
        where: eq(usersTable.id, userId),
      })
    )?.environment ??
    "sandbox";
  const row = await db.query.paypalConnections.findFirst({
    where: and(
      eq(paypalTable.userId, userId),
      eq(paypalTable.mode, selectedMode)
    ),
  });
  return row ? rowToPayPal(row) : undefined;
}

export async function upsertPayPalConnection(
  conn: PayPalConnection
): Promise<PayPalConnection> {
  const db = await getDb();
  await db
    .insert(paypalTable)
    .values({
      userId: conn.userId,
      clientId: conn.clientId,
      clientSecretEncrypted: conn.clientSecretEncrypted,
      mode: conn.mode,
      merchantEmail: conn.merchantEmail ?? null,
      webhookId: conn.webhookId ?? null,
      webhookUrl: conn.webhookUrl ?? null,
      webhookStatus: conn.webhookStatus,
      webhookError: conn.webhookError ?? null,
      connectedAt: conn.connectedAt,
    })
    .onConflictDoUpdate({
      target: [paypalTable.userId, paypalTable.mode],
      set: {
        clientId: conn.clientId,
        clientSecretEncrypted: conn.clientSecretEncrypted,
        mode: conn.mode,
        merchantEmail: conn.merchantEmail ?? null,
        webhookId: conn.webhookId ?? null,
        webhookUrl: conn.webhookUrl ?? null,
        webhookStatus: conn.webhookStatus,
        webhookError: conn.webhookError ?? null,
        connectedAt: conn.connectedAt,
      },
    });
  return conn;
}

export async function deletePayPalConnection(
  userId: string,
  mode: PayPalConnection["mode"]
): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .delete(paypalTable)
    .where(and(eq(paypalTable.userId, userId), eq(paypalTable.mode, mode)))
    .returning({ userId: paypalTable.userId });
  return result.length > 0;
}

// ── Stripe connections ─────────────────────────────────────────────────────

export async function getStripeConnection(
  userId: string,
  mode?: StripeConnection["mode"],
  storeId?: string
): Promise<StripeConnection | undefined> {
  if (
    storeId &&
    !(await getStoreCredentialSource(userId, storeId, "payment"))
  ) {
    return undefined;
  }
  const db = await getDb();
  const selectedMode =
    mode ??
    (
      await db.query.users.findFirst({
        columns: { environment: true },
        where: eq(usersTable.id, userId),
      })
    )?.environment ??
    "sandbox";
  const row = await db.query.stripeConnections.findFirst({
    where: and(
      eq(stripeTable.userId, userId),
      eq(stripeTable.mode, selectedMode)
    ),
  });
  return row ? rowToStripe(row) : undefined;
}

export async function upsertStripeConnection(
  connection: StripeConnection
): Promise<StripeConnection> {
  const db = await getDb();
  await db
    .insert(stripeTable)
    .values(connection)
    .onConflictDoUpdate({
      target: [stripeTable.userId, stripeTable.mode],
      set: {
        secretKeyEncrypted: connection.secretKeyEncrypted,
        webhookSecretEncrypted:
          connection.webhookSecretEncrypted ?? null,
        accountId: connection.accountId,
        connectedAt: connection.connectedAt,
      },
    });
  return connection;
}

export async function deleteStripeConnection(
  userId: string,
  mode: StripeConnection["mode"]
): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .delete(stripeTable)
    .where(and(eq(stripeTable.userId, userId), eq(stripeTable.mode, mode)))
    .returning({ userId: stripeTable.userId });
  return result.length > 0;
}
