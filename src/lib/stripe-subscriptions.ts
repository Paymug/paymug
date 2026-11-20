import "server-only";

import {
  createFeatureRecord,
  findFeatureRecordByDataValue,
  updateFeatureRecord,
} from "./feature-records";
import { findOrderById, findProductById } from "./db";
import {
  notifyPaymentReceived,
  notifySubscriptionCreated,
  notifySubscriptionUpdated,
} from "./notification-events";
import { getProductBillingCadence } from "./product-billing";
import { effectiveProduct } from "./product-variants";
import { sendStoreOrderPaymentEmail } from "./store-notification-emails";
import {
  isTerminalSubscriptionStatus,
} from "./subscription-cancel.utils";
import {
  mapStripeSubscriptionStatus,
  stripeInvoiceOrderId,
} from "./stripe-subscription.utils";
import { recordSubscriptionPaymentOrder } from "./subscription-orders";
import { sendSubscriptionStatusEmail } from "./transactional-emails";
import type { FeatureRecord, FeatureRecordValue } from "./feature-records.types";
import type {
  StripeCheckoutSession,
  StripeInvoice,
  StripeSubscription,
} from "./stripe.types";
import type { Order, PayPalMode } from "./types";

const MAX_TRACKED_INVOICES = 50;

function findByStripeSubscriptionId(
  subscriptionId: string,
  environment: PayPalMode,
  userId: string,
) {
  return findFeatureRecordByDataValue(
    "subscriptions",
    "stripeSubscriptionId",
    subscriptionId,
    environment,
    userId,
  );
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function invoiceSubscriptionId(invoice: StripeInvoice): string | undefined {
  return (
    invoice.subscription ||
    invoice.parent?.subscription_details?.subscription ||
    undefined
  );
}

/**
 * Creates the subscription record for a completed Stripe subscription Checkout
 * Session. Idempotent: the success redirect and the webhook both call it.
 */
export async function ensureStripeSubscriptionRecord(
  session: StripeCheckoutSession,
  order: Order,
): Promise<FeatureRecord | undefined> {
  if (session.mode !== "subscription" || !session.subscription) {
    return undefined;
  }
  const existing = await findByStripeSubscriptionId(
    session.subscription,
    order.environment,
    order.userId,
  );
  if (existing) return existing;

  const loaded = await findProductById(order.productId);
  if (!loaded) throw new Error("Subscription product not found");
  const product = effectiveProduct(loaded, order.custom);
  const cadence = getProductBillingCadence(product);
  if (!cadence) throw new Error("Subscription billing interval is not configured");

  const paidNow = (session.amount_total ?? order.amount) > 0;
  const trialing = !paidNow && product.trialDays > 0;
  const recurringCents =
    Number(session.metadata.recurringAmountCents) || order.amount;
  const discountPeriods = Number(session.metadata.discountPeriods) || null;
  const regularFee = Number(session.metadata.regularTransactionFeeAmount);
  const now = new Date().toISOString();
  const trialEndsAt = trialing
    ? new Date(Date.now() + product.trialDays * 86_400_000).toISOString()
    : null;

  const data: Record<string, FeatureRecordValue> = {
    storeId: order.storeId,
    productId: order.productId,
    productPrice: order.productPrice ?? product.price,
    amount: recurringCents / 100,
    introductoryAmount: discountPeriods ? order.amount / 100 : null,
    discountPeriods,
    currency: order.currency,
    interval: cadence.unit,
    intervalUnit: cadence.unit,
    intervalCount: cadence.count,
    trialDays: product.trialDays,
    discountCode: order.discountCode || null,
    discountAmount: order.discountAmount,
    transactionFeeAmount: order.transactionFeeAmount ?? 0,
    regularTransactionFeeAmount: Number.isFinite(regularFee)
      ? regularFee
      : (order.transactionFeeAmount ?? 0),
    affiliateId: order.affiliateId || null,
    githubUsername: order.githubUsername || null,
    customerName: order.customerName || null,
    custom: order.custom as unknown as FeatureRecordValue,
    environment: order.environment,
    source: "product_checkout",
    gateway: "stripe",
    orderId: order.id,
    stripeSubscriptionId: session.subscription,
    stripeCustomerId: session.customer || null,
    stripeStatus: trialing ? "trialing" : "active",
    benefitsProvisionedAt: now,
    paymentsReceived: paidNow ? 1 : 0,
    stripeInvoiceIds: [],
    ...(trialing
      ? { trialStartedAt: now, trialEndsAt }
      : {
          lastPaymentAt: now,
          lastPaymentAmount: (session.amount_total ?? order.amount) / 100,
          lastPaymentCurrency: order.currency,
        }),
  };
  const record = await createFeatureRecord(order.userId, "subscriptions", {
    title: product.name,
    subtitle: order.customerEmail,
    status: trialing ? "trialing" : "active",
    environment: order.environment,
    data,
  });
  await notifySubscriptionCreated(
    order.userId,
    record,
    `subscription-created:stripe:${session.subscription}`,
  );
  return record;
}

/**
 * Records a renewal payment (`invoice.paid`). The first invoice of a
 * subscription is the Checkout payment and is handled by the order flow, so
 * only `subscription_cycle` invoices with a charge create an order here.
 */
export async function handleStripeInvoicePaid(
  invoice: StripeInvoice,
  context: { userId: string; mode: PayPalMode },
): Promise<void> {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;
  if (invoice.billing_reason !== "subscription_cycle") return;
  if (invoice.amount_paid <= 0) return;

  const record = await findByStripeSubscriptionId(
    subscriptionId,
    context.mode,
    context.userId,
  );
  if (!record) return;
  const invoiceIds = stringList(record.data.stripeInvoiceIds);
  if (invoiceIds.includes(invoice.id)) return;

  const paidAt = new Date(
    (invoice.status_transitions?.paid_at || invoice.created) * 1000,
  ).toISOString();
  const paymentsReceived = Number(record.data.paymentsReceived || 0);
  const orderId = stripeInvoiceOrderId(invoice.id);
  const order = await recordSubscriptionPaymentOrder({
    subscription: record,
    paymentId: invoice.id,
    paidAt,
    amount: invoice.amount_paid / 100,
    currency: invoice.currency.toUpperCase(),
    isRenewal: true,
    paymentNumber: paymentsReceived + 1,
    provisionBenefits: !record.data.benefitsProvisionedAt,
    gateway: "stripe",
    orderId,
  });

  const previousStatus = record.status;
  const reactivated = !isTerminalSubscriptionStatus(previousStatus);
  const updated = await updateFeatureRecord(record.id, record.userId, {
    status: reactivated ? "active" : previousStatus,
    data: {
      ...record.data,
      stripeStatus: reactivated ? "active" : record.data.stripeStatus ?? null,
      paymentsReceived: paymentsReceived + 1,
      stripeInvoiceIds: [...invoiceIds, invoice.id].slice(-MAX_TRACKED_INVOICES),
      lastPaymentAt: paidAt,
      lastPaymentAmount: invoice.amount_paid / 100,
      lastPaymentCurrency: invoice.currency.toUpperCase(),
    },
  });
  if (order) {
    await notifyPaymentReceived(order);
    await sendStoreOrderPaymentEmail({ order });
  }
  if (updated && updated.status !== previousStatus) {
    await notifySubscriptionUpdated(
      record.userId,
      updated,
      `subscription-update:${updated.id}:${updated.updatedAt}`,
    );
  }
}

/** `invoice.payment_failed`: marks the subscription past due and tells the customer. */
export async function handleStripeInvoicePaymentFailed(
  invoice: StripeInvoice,
  context: { userId: string; mode: PayPalMode; requestUrl?: string },
): Promise<void> {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;
  // The first invoice is part of Checkout; its failure never creates a subscription.
  if (invoice.billing_reason === "subscription_create") return;
  const record = await findByStripeSubscriptionId(
    subscriptionId,
    context.mode,
    context.userId,
  );
  if (!record || isTerminalSubscriptionStatus(record.status)) return;

  const failedAt = new Date().toISOString();
  const alreadyPastDue = record.status === "past_due";
  const updated = await updateFeatureRecord(record.id, record.userId, {
    status: "past_due",
    data: {
      ...record.data,
      stripeStatus: "past_due",
      lastPaymentFailedAt: failedAt,
      lastFailedInvoiceId: invoice.id,
      paymentAttemptCount: invoice.attempt_count ?? null,
      nextPaymentAttemptAt: invoice.next_payment_attempt
        ? new Date(invoice.next_payment_attempt * 1000).toISOString()
        : null,
    },
  });
  if (!updated || alreadyPastDue) return;
  await notifySubscriptionUpdated(
    record.userId,
    updated,
    `subscription-update:${updated.id}:${updated.updatedAt}`,
  );
  await sendSubscriptionStatusEmail({
    subscription: updated,
    status: "past_due",
    requestUrl: context.requestUrl,
  });
}

/**
 * `customer.subscription.updated` / `.deleted`: keeps status in sync with
 * changes made at Stripe (dashboard cancellations, dunning outcomes, pauses).
 */
export async function handleStripeSubscriptionChange(
  subscription: StripeSubscription,
  context: {
    userId: string;
    mode: PayPalMode;
    deleted: boolean;
    requestUrl?: string;
  },
): Promise<void> {
  const record = await findByStripeSubscriptionId(
    subscription.id,
    context.mode,
    context.userId,
  );
  if (!record) return;
  const mapped = context.deleted
    ? "cancelled"
    : mapStripeSubscriptionStatus(subscription.status);
  const previousStatus = record.status;
  const wasTerminal = isTerminalSubscriptionStatus(previousStatus);
  const nextStatus = mapped && !wasTerminal ? mapped : previousStatus;

  const updated = await updateFeatureRecord(record.id, record.userId, {
    status: nextStatus,
    data: {
      ...record.data,
      stripeStatus: context.deleted ? "canceled" : subscription.status,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      ...(nextStatus === "cancelled" && !wasTerminal
        ? {
            cancelledAt: new Date().toISOString(),
            cancelledBy: record.data.cancelledBy ?? "provider",
          }
        : {}),
    },
  });
  if (!updated || nextStatus === previousStatus) return;
  await notifySubscriptionUpdated(
    record.userId,
    updated,
    `subscription-update:${updated.id}:${updated.updatedAt}`,
  );
  if (nextStatus === "active" || nextStatus === "trialing") return;
  await sendSubscriptionStatusEmail({
    subscription: updated,
    status: nextStatus,
    requestUrl: context.requestUrl,
  });
}
