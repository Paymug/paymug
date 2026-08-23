import type { FeatureRecord } from "./feature-records.types";
import {
  createFeatureWebhookData,
  createOrderWebhookData,
} from "./outbound-webhook-payload.utils";
import { dispatchOutboundWebhookEvent } from "./outbound-webhooks";
import type { OutboundWebhookEventName } from "./outbound-webhooks.types";
import type { Order } from "./types";

async function emitOrderPaidEvents(order: Order): Promise<void> {
  const events: OutboundWebhookEventName[] = ["order_created"];
  if (order.paypalOrderId) events.push("subscription_payment_success");
  await Promise.all(
    events.map((eventName) =>
      dispatchOutboundWebhookEvent({
        userId: order.userId,
        storeId: order.storeId,
        environment: order.environment,
        productId: order.productId,
        eventName,
        data: createOrderWebhookData(order),
      }),
    ),
  );
}

export async function emitCreatedOrderWebhook(order: Order): Promise<void> {
  if (order.status === "paid") await emitOrderPaidEvents(order);
}

export async function emitUpdatedOrderWebhook(
  previous: Order | undefined,
  order: Order | undefined,
): Promise<void> {
  if (!order || previous?.status === order.status) return;
  if (order.status === "paid") {
    await emitOrderPaidEvents(order);
    return;
  }
  const eventName =
    order.status === "refunded"
      ? "order_refunded"
      : order.status === "failed" && order.paypalOrderId
        ? "subscription_payment_failed"
        : undefined;
  if (!eventName) return;
  await dispatchOutboundWebhookEvent({
    userId: order.userId,
    storeId: order.storeId,
    environment: order.environment,
    productId: order.productId,
    eventName,
    data: createOrderWebhookData(order),
  });
}

function getFeatureStoreId(record: FeatureRecord): string | undefined {
  return typeof record.data.storeId === "string"
    ? record.data.storeId
    : undefined;
}

function getFeatureProductId(record: FeatureRecord): string | undefined {
  return typeof record.data.productId === "string"
    ? record.data.productId
    : undefined;
}

async function emitFeatureEvent(
  record: FeatureRecord,
  eventName: OutboundWebhookEventName,
): Promise<void> {
  const storeId = getFeatureStoreId(record);
  const productId = getFeatureProductId(record);
  if (!storeId || !productId) return;
  await dispatchOutboundWebhookEvent({
    userId: record.userId,
    storeId,
    environment: record.environment,
    productId,
    eventName,
    data: createFeatureWebhookData(record),
  });
}

export async function emitCreatedFeatureWebhook(
  record: FeatureRecord,
): Promise<void> {
  if (record.feature === "subscriptions") {
    await emitFeatureEvent(record, "subscription_created");
  } else if (record.feature === "licenses") {
    await emitFeatureEvent(record, "license_key_created");
  }
}

export async function emitUpdatedFeatureWebhook(
  previous: FeatureRecord | undefined,
  record: FeatureRecord | undefined,
): Promise<void> {
  if (!record) return;
  if (record.feature === "licenses") {
    await emitFeatureEvent(record, "license_key_updated");
    return;
  }
  if (record.feature !== "subscriptions") return;
  const events: OutboundWebhookEventName[] = ["subscription_updated"];
  if (previous?.status !== record.status) {
    if (record.status === "cancelled") events.push("subscription_cancelled");
    if (record.status === "expired") events.push("subscription_expired");
    if (
      record.status === "active" &&
      previous &&
      ["paused", "suspended", "cancelled"].includes(previous.status)
    ) {
      events.push("subscription_resumed");
    }
  }
  await Promise.all(events.map((eventName) => emitFeatureEvent(record, eventName)));
}
