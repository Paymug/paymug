import "server-only";

import { getPayPalCredentials } from "./payment-credentials";
import {
  findFeatureRecordByDataValue,
  listFeatureRecords,
  updateFeatureRecord,
} from "./feature-records";
import {
  findOrderByPaypalCaptureId,
  findOrderByPaypalOrderId,
  listUsers,
} from "./db";
import { notifyPayPalSubscriptionEvent } from "./notification-events";
import { getPayPalAccessToken, paypalBaseUrl } from "./paypal";
import { processPayPalOrderAccessWebhook } from "./paypal-order-webhooks";
import { sendPayPalSubscriptionEventEmail } from "./transactional-emails";
import { sendStoreSubscriptionPaymentEmail } from "./store-notification-emails";
import { reconcilePayPalSubscription } from "./paypal-subscription-reconciliation";
import {
  getSubscriptionTrialEndDate,
  parseSubscriptionTrialDays,
} from "./subscription-trial.utils";
import {
  activateSubscriptionTrialOrder,
  ensurePendingSubscriptionOrder,
  recordSubscriptionPaymentOrder,
} from "./subscription-orders";
import { absoluteUrl } from "./utils";
import type {
  PayPalWebhookEvent,
  PayPalWebhookConfiguration,
  PayPalWebhookDeleteInput,
  PayPalWebhookRouteInput,
  PayPalWebhookSetupInput,
  PayPalWebhookSetupResult,
} from "./paypal-webhooks.types";

/**
 * PayPal webhook events the app needs for:
 * - one-time checkout capture completion / refunds
 * - subscription renewals, cancellations, failures, and lifecycle
 */
export const PAYPAL_APP_WEBHOOK_EVENTS = [
  // One-time Orders v2 captures (checkout)
  "PAYMENT.CAPTURE.COMPLETED",
  "PAYMENT.CAPTURE.DENIED",
  "PAYMENT.CAPTURE.REFUNDED",
  "PAYMENT.CAPTURE.REVERSED",
  // Classic sale events (subscription renewals / refunds)
  "PAYMENT.SALE.COMPLETED",
  "PAYMENT.SALE.REFUNDED",
  "PAYMENT.SALE.REVERSED",
  // Subscription lifecycle
  "BILLING.SUBSCRIPTION.CREATED",
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.UPDATED",
  "BILLING.SUBSCRIPTION.RE-ACTIVATED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
] as const;

export function getPayPalSubscriptionWebhookUrl(
  userId: string,
  mode: PayPalWebhookSetupInput["mode"],
  requestUrl: string,
  webhookOrigin?: string
) {
  return absoluteUrl(
    `/api/webhooks/paypal/${mode}`,
    requestUrl,
    webhookOrigin
  );
}

function isPublicHttpsUrl(value: string) {
  const url = new URL(value);
  return (
    url.protocol === "https:" &&
    url.hostname !== "localhost" &&
    url.hostname !== "127.0.0.1" &&
    url.hostname !== "::1"
  );
}

function isPayPalSubscriptionWebhookUrl(
  value: string,
  userId: string,
  mode: PayPalWebhookSetupInput["mode"]
) {
  try {
    const url = new URL(value);
    // New static route, or the legacy per-user route (migrated on next setup).
    return (
      url.pathname === `/api/webhooks/paypal/${mode}` ||
      url.pathname === `/api/webhooks/paypal/${encodeURIComponent(userId)}/${mode}`
    );
  } catch {
    return false;
  }
}

export async function resolvePayPalWebhookUser(
  event: PayPalWebhookEvent,
  mode?: PayPalWebhookSetupInput["mode"]
): Promise<string | undefined> {
  const captureId =
    event.resource?.supplementary_data?.related_ids?.capture_id ||
    (event.event_type.startsWith("PAYMENT.CAPTURE.")
      ? event.resource?.id
      : undefined);
  if (captureId) {
    const order = await findOrderByPaypalCaptureId(captureId, mode);
    if (order) return order.userId;
  }
  const paypalOrderId =
    event.resource?.supplementary_data?.related_ids?.order_id;
  if (paypalOrderId) {
    const order = await findOrderByPaypalOrderId(paypalOrderId, mode);
    if (order) return order.userId;
  }
  const subscriptionId = getSubscriptionId(event);
  if (subscriptionId) {
    const record = await findFeatureRecordByDataValue(
      "subscriptions",
      "paypalSubscriptionId",
      subscriptionId,
      mode
    );
    if (record) return record.userId;
  }
  const users = await listUsers();
  return users.length === 1 ? users[0].id : undefined;
}

export async function getPayPalWebhookStatus(input: {
  userId: string;
  mode: PayPalWebhookSetupInput["mode"];
}): Promise<"active" | "not_configured"> {
  return (await getPayPalWebhookConfiguration(input))
    ? "active"
    : "not_configured";
}

export async function getPayPalWebhookConfiguration(input: {
  userId: string;
  mode: PayPalWebhookSetupInput["mode"];
}): Promise<PayPalWebhookConfiguration | undefined> {
  const connection = await getPayPalCredentials(input.userId, input.mode);
  if (!connection) return undefined;
  try {
    return await findPayPalSubscriptionWebhook({
      userId: input.userId,
      mode: input.mode,
      clientId: connection.clientId,
      clientSecret: connection.clientSecret,
    });
  } catch {
    return undefined;
  }
}

export async function findPayPalSubscriptionWebhook(input: {
  userId: string;
  mode: PayPalWebhookSetupInput["mode"];
  clientId: string;
  clientSecret: string;
}): Promise<{ id: string; url: string } | undefined> {
  return (await listPayPalSubscriptionWebhooks(input))[0];
}

async function listPayPalSubscriptionWebhooks(input: {
  userId: string;
  mode: PayPalWebhookSetupInput["mode"];
  clientId: string;
  clientSecret: string;
}): Promise<Array<{ id: string; url: string }>> {
  const token = await getPayPalAccessToken(
    input.clientId,
    input.clientSecret,
    input.mode
  );
  const list = await paypalWebhookRequest<{
    webhooks?: Array<{ id: string; url: string }>;
  }>(
    `${paypalBaseUrl(input.mode)}/v1/notifications/webhooks?page_size=20`,
    token
  );
  return (list.webhooks || []).filter((webhook) =>
    isPayPalSubscriptionWebhookUrl(webhook.url, input.userId, input.mode)
  );
}

async function paypalWebhookRequest<T>(
  url: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");
  const response = await fetch(url, {
    ...init,
    headers,
  });
  if (!response.ok) {
    throw new Error(`PayPal webhook setup failed: ${await response.text()}`);
  }
  return (await response.json()) as T;
}

function webhookEventPayload() {
  return PAYPAL_APP_WEBHOOK_EVENTS.map((name) => ({ name }));
}

async function configureWebhookEvents(
  baseUrl: string,
  token: string,
  webhook: {
    id: string;
    event_types?: Array<{ name: string }>;
  }
) {
  const configured = new Set(
    (webhook.event_types || []).map((event) => event.name)
  );
  // List responses often omit event_types; only skip when we know the set is complete.
  const hasAllEvents =
    configured.size > 0 &&
    PAYPAL_APP_WEBHOOK_EVENTS.every((event) => configured.has(event)) &&
    configured.size === PAYPAL_APP_WEBHOOK_EVENTS.length;
  if (hasAllEvents) return;

  await paypalWebhookRequest(
    `${baseUrl}/v1/notifications/webhooks/${webhook.id}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify([
        {
          op: "replace",
          path: "/event_types",
          value: webhookEventPayload(),
        },
      ]),
    }
  );
}

async function syncPayPalWebhookUrl(
  baseUrl: string,
  token: string,
  webhook: { id: string; url: string },
  webhookUrl: string
) {
  if (webhook.url === webhookUrl) return webhook;
  await paypalWebhookRequest(
    `${baseUrl}/v1/notifications/webhooks/${encodeURIComponent(webhook.id)}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify([
        {
          op: "replace",
          path: "/url",
          value: webhookUrl,
        },
      ]),
    }
  );
  return { ...webhook, url: webhookUrl };
}

/**
 * Creates the PayPal webhook (or updates an existing one) so it points at this
 * app and listens for every payment/subscription event we handle.
 */
export async function ensurePayPalSubscriptionWebhook(
  input: PayPalWebhookSetupInput
): Promise<PayPalWebhookSetupResult> {
  const webhookUrl = getPayPalSubscriptionWebhookUrl(
    input.userId,
    input.mode,
    input.requestUrl,
    input.webhookOrigin
  );
  if (!isPublicHttpsUrl(webhookUrl)) {
    return {
      webhookUrl,
      webhookStatus: "manual_required",
      webhookError:
        "PayPal requires a public HTTPS webhook URL. Enter the deployed app hostname, then retry setup.",
      eventTypes: [...PAYPAL_APP_WEBHOOK_EVENTS],
    };
  }

  const token = await getPayPalAccessToken(
    input.clientId,
    input.clientSecret,
    input.mode
  );
  const baseUrl = paypalBaseUrl(input.mode);
  const eventTypes = [...PAYPAL_APP_WEBHOOK_EVENTS];

  if (input.webhookId) {
    const webhook = await paypalWebhookRequest<{
      id: string;
      url: string;
      event_types?: Array<{ name: string }>;
    }>(
      `${baseUrl}/v1/notifications/webhooks/${encodeURIComponent(input.webhookId)}`,
      token
    );
    await syncPayPalWebhookUrl(baseUrl, token, webhook, webhookUrl);
    await configureWebhookEvents(baseUrl, token, webhook);
    return {
      webhookId: webhook.id,
      webhookUrl,
      webhookStatus: "active",
      eventTypes,
    };
  }

  const list = await paypalWebhookRequest<{
    webhooks?: Array<{
      id: string;
      url: string;
      event_types?: Array<{ name: string }>;
    }>;
  }>(`${baseUrl}/v1/notifications/webhooks?page_size=20`, token);
  const existing = list.webhooks?.find((webhook) =>
    isPayPalSubscriptionWebhookUrl(webhook.url, input.userId, input.mode)
  );
  if (existing) {
    await syncPayPalWebhookUrl(baseUrl, token, existing, webhookUrl);
    // List endpoint often omits event_types — re-apply the full app set.
    await configureWebhookEvents(baseUrl, token, existing);
    return {
      webhookId: existing.id,
      webhookUrl,
      webhookStatus: "active",
      eventTypes,
    };
  }

  const created = await paypalWebhookRequest<{ id: string }>(
    `${baseUrl}/v1/notifications/webhooks`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        url: webhookUrl,
        event_types: webhookEventPayload(),
      }),
    }
  );

  return {
    webhookId: created.id,
    webhookUrl,
    webhookStatus: "active",
    eventTypes,
  };
}

export async function deletePayPalSubscriptionWebhook(
  input: PayPalWebhookDeleteInput
) {
  const token = await getPayPalAccessToken(
    input.clientId,
    input.clientSecret,
    input.mode
  );
  const response = await fetch(
    `${paypalBaseUrl(input.mode)}/v1/notifications/webhooks/${encodeURIComponent(input.webhookId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );
  if (!response.ok && response.status !== 404) {
    throw new Error(`PayPal webhook removal failed: ${await response.text()}`);
  }
}

async function verifyPayPalWebhookEvent(
  input: PayPalWebhookRouteInput,
  webhookId: string,
  token: string
) {
  const verification = await paypalWebhookRequest<{
    verification_status?: string;
  }>(
    `${paypalBaseUrl(input.mode)}/v1/notifications/verify-webhook-signature`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        auth_algo: input.headers.get("paypal-auth-algo"),
        cert_url: input.headers.get("paypal-cert-url"),
        transmission_id: input.headers.get("paypal-transmission-id"),
        transmission_sig: input.headers.get("paypal-transmission-sig"),
        transmission_time: input.headers.get("paypal-transmission-time"),
        webhook_id: webhookId,
        webhook_event: input.event,
      }),
    }
  );
  return verification.verification_status === "SUCCESS";
}

function getSubscriptionId(event: PayPalWebhookEvent) {
  if (event.event_type.startsWith("BILLING.SUBSCRIPTION.")) {
    return event.resource?.id;
  }
  if (event.event_type.startsWith("PAYMENT.SALE.")) {
    return (
      event.resource?.billing_agreement_id ||
      event.resource?.supplementary_data?.related_ids?.subscription_id
    );
  }
  return undefined;
}

function getSubscriptionStatus(
  event: PayPalWebhookEvent,
  currentStatus: string
) {
  const statuses: Record<string, string> = {
    "BILLING.SUBSCRIPTION.CREATED": "approval_pending",
    "BILLING.SUBSCRIPTION.ACTIVATED": "active",
    "BILLING.SUBSCRIPTION.RE-ACTIVATED": "active",
    "BILLING.SUBSCRIPTION.EXPIRED": "expired",
    "BILLING.SUBSCRIPTION.CANCELLED": "cancelled",
    "BILLING.SUBSCRIPTION.SUSPENDED": "suspended",
    "BILLING.SUBSCRIPTION.PAYMENT.FAILED": "payment_failed",
    "PAYMENT.SALE.COMPLETED": "active",
  };
  const paypalStatus = (
    event.resource?.status ||
    event.resource?.state ||
    ""
  ).toLowerCase();
  const supportedStatuses: Record<string, string> = {
    active: "active",
    approval_pending: "approval_pending",
    suspended: "suspended",
    cancelled: "cancelled",
    expired: "expired",
  };
  return (
    statuses[event.event_type] ||
    supportedStatuses[paypalStatus] ||
    currentStatus
  );
}

export async function processPayPalSubscriptionWebhook(
  input: PayPalWebhookRouteInput
) {
  const connection = await getPayPalCredentials(input.userId, input.mode);
  if (!connection) {
    throw new Error("PayPal credentials are not configured for this connection");
  }

  const token = await getPayPalAccessToken(
    connection.clientId,
    connection.clientSecret,
    input.mode
  );
  const webhooks = await listPayPalSubscriptionWebhooks({
    userId: input.userId,
    mode: input.mode,
    clientId: connection.clientId,
    clientSecret: connection.clientSecret,
  });
  if (webhooks.length === 0) {
    throw new Error("PayPal webhook is not configured for this connection");
  }
  let verified = false;
  for (const webhook of webhooks) {
    if (await verifyPayPalWebhookEvent(input, webhook.id, token)) {
      verified = true;
      break;
    }
  }
  if (!verified) throw new Error("PayPal webhook signature verification failed");

  const orderUpdated = await processPayPalOrderAccessWebhook(input);
  if (orderUpdated) return { updated: true };

  const subscriptionId = getSubscriptionId(input.event);
  if (!subscriptionId) return { updated: false };

  const records = await listFeatureRecords(
    input.userId,
    "subscriptions",
    input.mode
  );
  const record = records.find(
    (candidate) =>
      candidate.data.paypalSubscriptionId === subscriptionId
  );
  if (!record) return { updated: false };
  await ensurePendingSubscriptionOrder(record);
  if (record.data.lastWebhookEventId === input.event.id) {
    return { updated: false };
  }
  const previousStatus = record.status;
  const emailedEventIds = Array.isArray(record.data.emailedEventIds)
    ? record.data.emailedEventIds.filter(
        (value): value is string => typeof value === "string"
      )
    : [];

  const paymentIds = Array.isArray(record.data.paypalPaymentIds)
    ? record.data.paypalPaymentIds.filter(
        (value): value is string => typeof value === "string"
      )
    : [];
  const isCompletedPayment =
    input.event.event_type === "PAYMENT.SALE.COMPLETED";
  const paymentId = isCompletedPayment ? input.event.resource?.id : undefined;
  const isNewPayment = Boolean(paymentId && !paymentIds.includes(paymentId));
  const nextPaymentIds =
    isNewPayment && paymentId
      ? [...paymentIds, paymentId].slice(-50)
      : paymentIds;
  const paymentHistory = Array.isArray(record.data.paypalPaymentHistory)
    ? record.data.paypalPaymentHistory
    : [];
  const nextPaymentHistory =
    isNewPayment && paymentId
      ? [
          ...paymentHistory,
          {
            id: paymentId,
            date: input.event.create_time || new Date().toISOString(),
            amount: Number(input.event.resource?.amount?.total || 0),
            currency: input.event.resource?.amount?.currency || null,
          },
        ].slice(-50)
      : paymentHistory;
  const eventAt = input.event.create_time || new Date().toISOString();
  const trialDays = parseSubscriptionTrialDays(record.data.trialDays);
  const mappedStatus = getSubscriptionStatus(input.event, record.status);
  const trialStartedAt =
    typeof record.data.trialStartedAt === "string"
      ? record.data.trialStartedAt
      : mappedStatus === "active" && trialDays > 0
        ? eventAt
        : undefined;
  const trialEndsAt =
    typeof record.data.trialEndsAt === "string"
      ? record.data.trialEndsAt
      : trialStartedAt
        ? getSubscriptionTrialEndDate(trialStartedAt, trialDays)
        : undefined;
  const isTrialing = Boolean(
    mappedStatus === "active" &&
      !isCompletedPayment &&
      Number(record.data.paymentsReceived || 0) === 0 &&
      trialEndsAt &&
      trialEndsAt > eventAt
  );
  const existingBenefitsProvisionedAt =
    typeof record.data.benefitsProvisionedAt === "string"
      ? record.data.benefitsProvisionedAt
      : undefined;
  let benefitsProvisionedAt = existingBenefitsProvisionedAt;
  let reconciledOrderId: string | undefined;

  if (
    input.event.event_type === "BILLING.SUBSCRIPTION.ACTIVATED" ||
    input.event.event_type === "BILLING.SUBSCRIPTION.RE-ACTIVATED"
  ) {
    try {
      const reconciliation = await reconcilePayPalSubscription({
        subscription: record,
      });
      benefitsProvisionedAt =
        benefitsProvisionedAt || reconciliation.benefitsProvisionedAt;
      reconciledOrderId = reconciliation.orderId;
    } catch (error) {
      console.error("PayPal activation reconciliation failed", {
        mode: input.mode,
        subscriptionId,
        eventId: input.event.id,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (isTrialing && !benefitsProvisionedAt) {
    const trialOrder = await activateSubscriptionTrialOrder({
      subscription: record,
      activatedAt: eventAt,
    });
    if (trialOrder) benefitsProvisionedAt = eventAt;
  }

  if (isNewPayment && paymentId) {
    const paymentOrder = await recordSubscriptionPaymentOrder({
      subscription: record,
      paymentId,
      paidAt: eventAt,
      amount: Number(input.event.resource?.amount?.total || 0),
      currency: input.event.resource?.amount?.currency,
      isRenewal: Number(record.data.paymentsReceived || 0) > 0,
      paymentNumber: Number(record.data.paymentsReceived || 0) + 1,
      provisionBenefits: !benefitsProvisionedAt,
    });
    if (paymentOrder && !benefitsProvisionedAt) {
      benefitsProvisionedAt = eventAt;
    }
  }
  const updatedRecord = await updateFeatureRecord(record.id, input.userId, {
    status: isTrialing ? "trialing" : mappedStatus,
    data: {
      ...record.data,
      ...(reconciledOrderId ? { orderId: reconciledOrderId } : {}),
      ...(trialStartedAt
        ? { trialStartedAt, trialEndsAt: trialEndsAt || null }
        : {}),
      paypalStatus:
        input.event.resource?.status ||
        input.event.resource?.state ||
        record.data.paypalStatus ||
        null,
      lastWebhookEventId: input.event.id,
      lastWebhookEventType: input.event.event_type,
      lastWebhookAt: eventAt,
      ...(benefitsProvisionedAt
        ? { benefitsProvisionedAt }
        : {}),
      paypalPaymentIds: nextPaymentIds,
      paypalPaymentHistory: nextPaymentHistory,
      paymentsReceived:
        Number(record.data.paymentsReceived || 0) + (isNewPayment ? 1 : 0),
      ...(isNewPayment
        ? {
            lastPaymentId: paymentId || null,
            lastPaymentAt: eventAt,
            lastPaymentAmount:
              input.event.resource?.amount?.total || null,
            lastPaymentCurrency:
              input.event.resource?.amount?.currency || null,
          }
        : {}),
      ...(input.event.event_type ===
      "BILLING.SUBSCRIPTION.PAYMENT.FAILED"
        ? {
            lastPaymentFailedAt: eventAt,
          }
        : {}),
    },
  });
  await notifyPayPalSubscriptionEvent({
    userId: input.userId,
    record: updatedRecord || record,
    event: input.event,
    isNewPayment,
  });
  if (isNewPayment) {
    await sendStoreSubscriptionPaymentEmail({
      subscription: updatedRecord || record,
      event: input.event,
      isRenewal: Number(record.data.paymentsReceived || 0) > 0,
    });
  }
  if (!emailedEventIds.includes(input.event.id)) {
    const emailSent = await sendPayPalSubscriptionEventEmail({
      subscription: updatedRecord || record,
      event: input.event,
      isNewPayment,
      previousStatus,
    });
    if (emailSent && updatedRecord) {
      await updateFeatureRecord(record.id, input.userId, {
        data: {
          ...updatedRecord.data,
          emailedEventIds: [...emailedEventIds, input.event.id].slice(-100),
        },
      });
    }
  }

  return { updated: true };
}
