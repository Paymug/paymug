import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { featureRecords } from "@/db/schema";
import { findProductById } from "../db";
import { formatMoney } from "../format";
import { getProductPublicPath } from "../product-paths";
import { getRequiredRuntimeEnvValue, getRuntimeAbsoluteUrl } from "../runtime-env";
import { renderEmailLayout } from "../transactional-email-templates";
import { sendStoreEmail } from "../transactional-emails";
import { effectiveProduct } from "../product-variants";
import { isMigrationSource, type MigrationSourceId } from "../migrations/sources";
import {
  resubscribeCustomKey,
  signResubscribeToken,
  trialDaysUntil,
  verifyResubscribeToken,
} from "./resubscribe";

type Row = typeof featureRecords.$inferSelect;

function dataOf(row: Row): Record<string, unknown> {
  try {
    const value = JSON.parse(row.data);
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

/**
 * Validates a checkout's re-subscribe token. Returns the trial length that
 * makes the first charge land on the old renewal date, or undefined when the
 * checkout did not come from a migration link.
 */
export async function resolveResubscribe(
  custom: Record<string, string> | undefined,
  customerEmail: string,
  productId: string,
): Promise<{ recordId: string; trialDays: number } | undefined> {
  const token = custom?.[resubscribeCustomKey];
  if (!token) return undefined;
  const recordId = verifyResubscribeToken(token, await getRequiredRuntimeEnvValue("AUTH_SECRET"));
  if (!recordId) throw new Error("This re-subscribe link is not valid");
  const db = await getDb();
  const row = await db.query.featureRecords.findFirst({
    where: and(eq(featureRecords.id, recordId), eq(featureRecords.feature, "subscriptions")),
  });
  const data = row ? dataOf(row) : {};
  if (
    !row ||
    typeof data.source !== "string" ||
    !isMigrationSource(data.source) ||
    row.status !== "migration_pending" ||
    (row.subtitle ?? "").trim().toLowerCase() !== customerEmail.trim().toLowerCase() ||
    data.productId !== productId
  ) {
    throw new Error("This re-subscribe link does not match your email or has already been used");
  }
  return { recordId, trialDays: trialDaysUntil(String(data.renewsAt ?? ""), Date.now()) };
}

/** Notes on the old record that the customer started a new checkout. */
export async function noteResubscribeStarted(recordId: string): Promise<void> {
  const db = await getDb();
  const row = await db.query.featureRecords.findFirst({ where: eq(featureRecords.id, recordId) });
  if (!row) return;
  await db
    .update(featureRecords)
    .set({
      data: JSON.stringify({ ...dataOf(row), resubscribeStartedAt: new Date().toISOString() }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(featureRecords.id, recordId));
}

export interface ResubscribeSendResult {
  sent: string[];
  skipped: Array<{ recordId: string; reason: string }>;
  failed: string[];
}

/** Emails each PayPal subscriber a personal link that keeps their renewal date. */
export async function sendResubscribeEmails(params: {
  userId: string;
  storeId: string;
  environment: "sandbox" | "live";
  requestUrl: string;
  recordIds?: string[];
  resend?: boolean;
  source?: MigrationSourceId;
}): Promise<ResubscribeSendResult> {
  const db = await getDb();
  const secret = await getRequiredRuntimeEnvValue("AUTH_SECRET");
  const rows = (
    await db.query.featureRecords.findMany({
      where: and(
        eq(featureRecords.userId, params.userId),
        eq(featureRecords.environment, params.environment),
        eq(featureRecords.feature, "subscriptions"),
        eq(featureRecords.status, "migration_pending"),
        sql`json_extract(${featureRecords.data}, '$.source') = ${params.source ?? "lemonsqueezy"}`,
      ),
    })
  ).filter(
    (row) =>
      dataOf(row).storeId === params.storeId &&
      (dataOf(row).migrationState === "needs_resubscribe" || dataOf(row).paymentProcessor === "paypal") &&
      (!params.recordIds || params.recordIds.includes(row.id)),
  );
  const result: ResubscribeSendResult = { sent: [], skipped: [], failed: [] };
  for (const row of rows) {
    const data = dataOf(row);
    if (data.resubscribeEmailedAt && !params.resend) {
      result.skipped.push({ recordId: row.id, reason: "Already emailed" });
      continue;
    }
    const product = typeof data.productId === "string" ? await findProductById(data.productId) : undefined;
    const email = (row.subtitle ?? "").trim();
    if (!product || !email) {
      result.skipped.push({ recordId: row.id, reason: "Product or email missing" });
      continue;
    }
    const variantId = typeof data.variantId === "string" ? data.variantId : undefined;
    const sold = effectiveProduct(product, { product_option: variantId });
    const path = `${getProductPublicPath(product)}?${new URLSearchParams({
      ...(variantId ? { variant: variantId } : {}),
      [`[custom][${resubscribeCustomKey}]`]: signResubscribeToken(row.id, secret),
    })}`;
    const url = await getRuntimeAbsoluteUrl(path, params.requestUrl);
    const renews = typeof data.renewsAt === "string" ? data.renewsAt.slice(0, 10) : null;
    const ok = await sendStoreEmail(params.userId, params.storeId, (store) => {
      const layout = renderEmailLayout({
        storeName: store.name,
        storeLogo: store.logo,
        eyebrow: "Subscription update",
        title: `Please re-subscribe to ${product.name}`,
        intro: renews
          ? `We are moving to a new billing system and your subscription cannot be transferred automatically. Re-subscribe with the link below. You will not be charged before ${renews}, your next renewal date.`
          : "We are moving to a new billing system and your subscription cannot be transferred automatically. Re-subscribe with the link below.",
        rows: [
          { label: "Plan", value: sold.variantName ? `${product.name} (${sold.variantName})` : product.name },
          { label: "Price", value: formatMoney(sold.price, product.currency) },
        ],
        actionLabel: "Re-subscribe",
        actionUrl: url,
      });
      return { to: email, subject: `Action needed: re-subscribe to ${product.name}`, ...layout };
    });
    if (!ok) {
      result.failed.push(row.id);
      continue;
    }
    await db
      .update(featureRecords)
      .set({
        data: JSON.stringify({ ...data, resubscribeEmailedAt: new Date().toISOString() }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(featureRecords.id, row.id));
    result.sent.push(row.id);
  }
  return result;
}
