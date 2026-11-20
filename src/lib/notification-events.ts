import "server-only";

import { formatMoney } from "./format";
import { createNotificationSafely } from "./notifications";
import type {
  OrderPaymentFailureInput,
  PayPalSubscriptionNotificationInput,
} from "./notifications.types";
import type { FeatureRecord } from "./feature-records.types";
import type { Order } from "./types";

export async function notifyInvoiceCreated(order: Order) {
  await createNotificationSafely(order.userId, {
    environment: order.environment,
    type: "invoice_created",
    title: "Invoice created",
    message: `${order.customerName || order.customerEmail} started checkout for ${order.productName} — ${formatMoney(order.amount, order.currency)}.`,
    href: `/invoices/${order.id}`,
    // One notification per customer + product per 30 minutes: every checkout
    // attempt creates a new order, and retries would otherwise repeat the alert.
    sourceKey: `invoice:${order.customerEmail.trim().toLowerCase()}:${order.productId}:${Math.floor(new Date(order.createdAt).getTime() / 1_800_000)}`,
  });
}

export async function notifyPaymentReceived(order: Order) {
  const free = order.gateway === "free";
  await createNotificationSafely(order.userId, {
    environment: order.environment,
    type: free ? "order_completed" : "payment_received",
    title: free ? "Free order completed" : "Payment received",
    message: free
      ? `${order.customerName || order.customerEmail} completed a free checkout for ${order.productName}.`
      : `${formatMoney(order.amount, order.currency)} received from ${order.customerName || order.customerEmail} for ${order.productName}.`,
    href: "/dashboard/orders",
    sourceKey: `payment:${order.paypalCaptureId || order.stripePaymentIntentId || order.id}`,
  });
}

export async function notifyPaymentFailed({
  order,
  paypalStatus,
}: OrderPaymentFailureInput) {
  await createNotificationSafely(order.userId, {
    environment: order.environment,
    type: "payment_failed",
    title: "Payment failed",
    message: `${order.customerName || order.customerEmail}'s payment for ${order.productName} was not completed (${paypalStatus}).`,
    href: "/dashboard/orders",
    sourceKey: `payment-failed:${order.id}:${paypalStatus}`,
  });
}

export async function notifyAffiliateApplied(
  userId: string,
  affiliate: FeatureRecord
) {
  await createNotificationSafely(userId, {
    environment: affiliate.environment,
    type: "affiliate_applied",
    title: "New affiliate application",
    message: `${affiliate.title}${affiliate.subtitle ? ` (${affiliate.subtitle})` : ""} applied to your affiliate program.`,
    href: "/dashboard/affiliates",
    sourceKey: `affiliate-applied:${affiliate.id}:${affiliate.updatedAt}`,
  });
}

function isTrialSubscription(subscription: FeatureRecord) {
  return (
    subscription.status === "trialing" ||
    (Boolean(subscription.data.trialEndsAt) && !subscription.data.lastPaymentAt)
  );
}

/** `sourceKey` should be stable per subscription so retries never repeat it. */
export async function notifySubscriptionCreated(
  userId: string,
  subscription: FeatureRecord,
  sourceKey = `subscription-created:${subscription.id}`
) {
  const trial = isTrialSubscription(subscription);
  await createNotificationSafely(userId, {
    environment: subscription.environment,
    type: trial ? "subscription_trial_started" : "subscription_created",
    title: trial ? "Subscription created (trial)" : "Subscription created",
    message: `${subscription.subtitle || "A customer"} ${trial ? "started a trial of" : "subscribed to"} ${subscription.title}.`,
    href: "/dashboard/subscriptions",
    sourceKey,
  });
}

export async function notifySubscriptionUpdated(
  userId: string,
  subscription: FeatureRecord,
  sourceKey: string
) {
  await createNotificationSafely(userId, {
    environment: subscription.environment,
    type: "subscription_updated",
    title: "Subscription updated",
    message: `${subscription.title} for ${subscription.subtitle || "a customer"} is now ${subscription.status.replaceAll("_", " ")}.`,
    href: "/dashboard/subscriptions",
    sourceKey,
  });
}

export async function notifyPayPalSubscriptionEvent({
  userId,
  record,
  event,
  isNewPayment,
}: PayPalSubscriptionNotificationInput) {
  const amount = Number(event.resource?.amount?.total || 0);
  const currency =
    event.resource?.amount?.currency ||
    String(record.data.lastPaymentCurrency || "USD");

  if (event.event_type === "PAYMENT.SALE.COMPLETED" && isNewPayment) {
    await createNotificationSafely(userId, {
      environment: record.environment,
      type: "subscription_renewed",
      title: "Subscription renewed",
      message: `${record.title} renewed for ${formatMoney(Math.round(amount * 100), currency)}.`,
      href: "/dashboard/subscriptions",
      sourceKey: `paypal:${event.id}`,
    });
    return;
  }

  if (event.event_type === "BILLING.SUBSCRIPTION.PAYMENT.FAILED") {
    await createNotificationSafely(userId, {
      environment: record.environment,
      type: "payment_failed",
      title: "Subscription payment failed",
      message: `PayPal could not renew ${record.title} for ${record.subtitle || "the customer"}.`,
      href: "/dashboard/subscriptions",
      sourceKey: `paypal:${event.id}`,
    });
    return;
  }

  if (
    event.event_type === "PAYMENT.SALE.REFUNDED" ||
    event.event_type === "PAYMENT.SALE.REVERSED"
  ) {
    await createNotificationSafely(userId, {
      environment: record.environment,
      type: "payment_refunded",
      title:
        event.event_type === "PAYMENT.SALE.REFUNDED"
          ? "Subscription payment refunded"
          : "Subscription payment reversed",
      message: `${record.title} for ${record.subtitle || "the customer"} has a refunded or reversed payment.`,
      href: "/dashboard/subscriptions",
      sourceKey: `paypal:${event.id}`,
    });
    return;
  }

  if (event.event_type === "BILLING.SUBSCRIPTION.ACTIVATED") {
    await notifySubscriptionCreated(userId, record);
    return;
  }

  if (event.event_type.startsWith("BILLING.SUBSCRIPTION.")) {
    await createNotificationSafely(userId, {
      environment: record.environment,
      type: "subscription_updated",
      title: "Subscription updated",
      message: `${record.title} for ${record.subtitle || "the customer"}: ${event.event_type.replace("BILLING.SUBSCRIPTION.", "").toLowerCase().replaceAll("_", " ")}.`,
      href: "/dashboard/subscriptions",
      // Shares the key with in-app cancellation so one cancel shows once.
      sourceKey:
        event.event_type === "BILLING.SUBSCRIPTION.CANCELLED"
          ? `subscription-status:${record.id}:cancelled`
          : `paypal:${event.id}`,
    });
  }
}
