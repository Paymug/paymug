import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { featureRecords } from "@/db/schema";
import { findProductById } from "../db";
import { getStripeCredentials } from "../payment-credentials";
import { effectiveProduct } from "../product-variants";
import {
  createStripeMigratedSubscription,
  findStripeCardCustomersByEmail,
} from "../stripe";
import { isMigrationSource, migrationSources, type MigrationSourceId } from "../migrations/sources";
import { matchMapping, type StripeMappingRow } from "../migrations/stripe-import-mapping";
import type { MigrationSubscriptionRow } from "./subscription-state";
import {
  planStripeLinks,
  summarizePlan,
  type LinkPlanItem,
  type PendingSubscription,
  type StripeCardCustomer,
} from "./subscription-linking";

type Row = typeof featureRecords.$inferSelect;


function dataOf(row: Row): Record<string, unknown> {
  try {
    const value = JSON.parse(row.data);
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

const text = (value: unknown): string | null =>
  typeof value === "string" && value ? value : null;

async function loadRows(
  userId: string,
  storeId: string,
  environment: "sandbox" | "live",
  source: MigrationSourceId = "lemonsqueezy",
) {
  const db = await getDb();
  const rows = await db.query.featureRecords.findMany({
    where: and(
      eq(featureRecords.userId, userId),
      eq(featureRecords.environment, environment),
      eq(featureRecords.feature, "subscriptions"),
      sql`json_extract(${featureRecords.data}, '$.source') = ${source}`,
    ),
  });
  return rows.filter((row) => dataOf(row).storeId === storeId);
}

export async function listMigrationSubscriptions(
  userId: string,
  storeId: string,
  environment: "sandbox" | "live",
  source: MigrationSourceId = "lemonsqueezy",
): Promise<MigrationSubscriptionRow[]> {
  const rows = await loadRows(userId, storeId, environment, source);
  // A PayPal customer converts when a normal Paymug subscription for the same
  // email and product is active.
  const db = await getDb();
  const live = (
    await db.query.featureRecords.findMany({
      where: and(
        eq(featureRecords.userId, userId),
        eq(featureRecords.environment, environment),
        eq(featureRecords.feature, "subscriptions"),
        eq(featureRecords.status, "active"),
      ),
    })
  ).filter((row) => {
    const rowSource = dataOf(row).source;
    return typeof rowSource !== "string" || !isMigrationSource(rowSource);
  });
  return rows.map((row) => {
    const data = dataOf(row);
    const converted = live.find(
      (candidate) =>
        (candidate.subtitle ?? "").toLowerCase() === (row.subtitle ?? "").toLowerCase() &&
        dataOf(candidate).productId === data.productId,
    );
    return {
      id: row.id,
      email: row.subtitle ?? "",
      product: row.title,
      variant: text(data.variantName),
      status: row.status,
      migrationState: text(data.migrationState) ?? "not_required",
      processor: text(data.paymentProcessor) ?? "unknown",
      cardLast4: text(data.cardLast4),
      renewsAt: text(data.renewsAt),
      lsSourceId: text(data.sourceId) ?? "",
      stripeSubscriptionId: text(data.stripeSubscriptionId),
      resubscribedAt: converted ? converted.createdAt : null,
      resubscribeEmailedAt: text(data.resubscribeEmailedAt),
      lsCancelledAt: text(data.lsCancelledAt),
    };
  });
}

async function resolvePrice(data: Record<string, unknown>): Promise<PendingSubscription["price"]> {
  const productId = text(data.productId);
  if (!productId) return null;
  const product = await findProductById(productId);
  if (!product) return null;
  const effective = effectiveProduct(product, {
    product_option: text(data.variantId) ?? undefined,
  });
  if (effective.billingType !== "subscription" || !effective.intervalUnit) return null;
  return {
    amountCents: effective.price,
    currency: effective.currency,
    interval: effective.intervalUnit,
    intervalCount: effective.intervalCount,
  };
}

export interface StripeLinkResult {
  dryRun: boolean;
  summary: ReturnType<typeof summarizePlan>;
  items: LinkPlanItem[];
  linked: string[];
  failed: Array<{ recordId: string; message: string }>;
}

/**
 * Plans, and unless `dryRun`, creates Stripe subscriptions for imported card
 * subscriptions whose cards have arrived in the seller's Stripe account.
 */
export async function linkStripeSubscriptions(params: {
  userId: string;
  storeId: string;
  environment: "sandbox" | "live";
  dryRun: boolean;
  recordIds?: string[];
  source?: MigrationSourceId;
}): Promise<StripeLinkResult> {
  const source = params.source ?? "lemonsqueezy";
  const connection = await getStripeCredentials(params.userId, params.environment, params.storeId);
  if (!connection) throw new Error("Connect Stripe in Settings, Payments first");
  const rows = (await loadRows(params.userId, params.storeId, params.environment, source)).filter((row) => {
    const data = dataOf(row);
    return (
      row.status === "migration_pending" &&
      data.paymentProcessor === "stripe" &&
      (!params.recordIds || params.recordIds.includes(row.id))
    );
  });
  const pending: PendingSubscription[] = [];
  for (const row of rows) {
    const data = dataOf(row);
    pending.push({
      recordId: row.id,
      email: (row.subtitle ?? "").toLowerCase(),
      productName: row.title,
      variantName: text(data.variantName),
      renewsAt: text(data.renewsAt),
      cardLast4: text(data.cardLast4),
      price: await resolvePrice(data),
    });
  }
  const customers = new Map<string, StripeCardCustomer[]>();
  for (const email of new Set(pending.map((item) => item.email))) {
    customers.set(email, await findStripeCardCustomersByEmail(connection.secretKey, email));
  }
  // Exact ids from an uploaded Stripe mapping file win over email matching.
  const mapped = new Map<string, StripeCardCustomer>();
  for (const row of rows) {
    const data = dataOf(row);
    const customerId = text(data.stripeCustomerId);
    if (!customerId || text(data.stripeSubscriptionId)) continue;
    let paymentMethodId = text(data.stripePaymentMethodId);
    if (!paymentMethodId) {
      const email = (row.subtitle ?? "").toLowerCase();
      paymentMethodId =
        (customers.get(email) ?? []).find((c) => c.customerId === customerId)?.paymentMethodId ?? null;
    }
    mapped.set(row.id, { customerId, paymentMethodId, last4: text(data.cardLast4) });
  }
  const items = planStripeLinks(pending, customers, Date.now(), {
    mapped,
    sourceLabel: migrationSources[source].label,
  });
  const result: StripeLinkResult = {
    dryRun: params.dryRun,
    summary: summarizePlan(items),
    items,
    linked: [],
    failed: [],
  };
  if (params.dryRun) return result;

  const db = await getDb();
  for (const item of items) {
    if (item.action !== "create") continue;
    const price = pending.find((entry) => entry.recordId === item.recordId)?.price;
    const row = rows.find((entry) => entry.id === item.recordId);
    if (!price || !row) continue;
    try {
      const subscription = await createStripeMigratedSubscription(connection.secretKey, {
        customerId: item.customerId as string,
        paymentMethodId: item.paymentMethodId as string,
        currency: price.currency,
        amountCents: price.amountCents,
        interval: price.interval,
        intervalCount: price.intervalCount,
        productName: item.variantName ? `${item.productName} (${item.variantName})` : item.productName,
        firstChargeAt: item.firstChargeAt as number,
        idempotencyKey: `lsmig-${row.id}`,
        metadata: {
          paymugSubscriptionRecord: row.id,
          migrationSource: source,
          sourceSubscription: text(dataOf(row).sourceId) ?? "",
          lemonSqueezySubscription: source === "lemonsqueezy" ? (text(dataOf(row).sourceId) ?? "") : "",
        },
      });
      await db
        .update(featureRecords)
        .set({
          status: "active",
          data: JSON.stringify({
            ...dataOf(row),
            migrationState: "linked",
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: item.customerId,
            amount: price.amountCents / 100,
            currency: price.currency,
            intervalUnit: price.interval,
            intervalCount: price.intervalCount,
            linkedAt: new Date().toISOString(),
          }),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(featureRecords.id, row.id));
      result.linked.push(row.id);
    } catch (error) {
      result.failed.push({
        recordId: row.id,
        message: error instanceof Error ? error.message.slice(0, 300) : "Stripe request failed",
      });
    }
  }
  return result;
}


export async function markLemonSqueezyCancelled(recordId: string): Promise<void> {
  const db = await getDb();
  const row = await db.query.featureRecords.findFirst({ where: eq(featureRecords.id, recordId) });
  if (!row) return;
  const data = dataOf(row);
  await db
    .update(featureRecords)
    .set({
      status: row.status === "migration_pending" ? "superseded" : row.status,
      data: JSON.stringify({
        ...data,
        lsCancelledAt: new Date().toISOString(),
        migrationState: data.migrationState === "linked" ? "linked" : "resubscribed",
      }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(featureRecords.id, recordId));
}


/**
 * Applies a parsed Stripe mapping file: stores exact Stripe ids on imported
 * subscriptions so linking no longer depends on email. Also marks them as
 * card subscriptions, since the cards now exist in Stripe.
 */
export async function applyStripeMapping(params: {
  userId: string;
  storeId: string;
  environment: "sandbox" | "live";
  source: MigrationSourceId;
  rows: StripeMappingRow[];
}): Promise<{ matched: number; unmatched: number }> {
  const rows = (await loadRows(params.userId, params.storeId, params.environment, params.source)).filter(
    (row) => row.status === "migration_pending",
  );
  const { matched } = matchMapping(
    rows.map((row) => ({
      recordId: row.id,
      sourceCustomerId: text(dataOf(row).sourceCustomerId),
      sourcePaymentMethodId: text(dataOf(row).sourcePaymentMethodId),
    })),
    params.rows,
  );
  const db = await getDb();
  for (const row of rows) {
    const hit = matched.get(row.id);
    if (!hit) continue;
    await db
      .update(featureRecords)
      .set({
        data: JSON.stringify({
          ...dataOf(row),
          paymentProcessor: "stripe",
          migrationState: "waiting_for_cards",
          stripeCustomerId: hit.stripeCustomerId,
          stripePaymentMethodId: hit.stripePaymentMethodId,
        }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(featureRecords.id, row.id));
  }
  return { matched: matched.size, unmatched: rows.length - matched.size };
}
