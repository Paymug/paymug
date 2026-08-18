import "server-only";

import {
  completeCommerceFeatures,
  getOrderLicense,
} from "./commerce-features";
import {
  findOrderByPaypalCaptureId,
  findOrderByPaypalOrderId,
  findProductById,
  updateOrder,
} from "./db";
import { revokeGitHubOrderAccess } from "./github-access";
import {
  notifyPaymentFailed,
  notifyPaymentReceived,
} from "./notification-events";
import type { PayPalWebhookRouteInput } from "./paypal-webhooks.types";
import { sendStoreOrderPaymentEmail } from "./store-notification-emails";
import { sendPurchaseConfirmationEmail } from "./transactional-emails";

const invalidCaptureEvents = new Set([
  "PAYMENT.CAPTURE.REFUNDED",
  "PAYMENT.CAPTURE.REVERSED",
  "PAYMENT.CAPTURE.DENIED",
]);

async function findOrderForCaptureEvent(input: PayPalWebhookRouteInput) {
  const captureId =
    input.event.resource?.supplementary_data?.related_ids?.capture_id ||
    input.event.resource?.id;
  const paypalOrderId =
    input.event.resource?.supplementary_data?.related_ids?.order_id;

  const byCapture = captureId
    ? await findOrderByPaypalCaptureId(captureId, input.mode)
    : undefined;
  if (byCapture) return byCapture;

  if (paypalOrderId) {
    return findOrderByPaypalOrderId(paypalOrderId, input.mode);
  }
  return undefined;
}

async function processCaptureCompleted(
  input: PayPalWebhookRouteInput
): Promise<boolean> {
  const order = await findOrderForCaptureEvent(input);
  if (
    !order ||
    order.userId !== input.userId ||
    order.environment !== input.mode
  ) {
    return false;
  }
  if (order.status === "paid" || order.status === "refunded") {
    return true;
  }

  const captureId = input.event.resource?.id || order.paypalCaptureId;
  const paidAt = input.event.create_time || new Date().toISOString();
  const updated = await updateOrder(order.id, {
    status: "paid",
    paypalCaptureId: captureId,
    paidAt,
  });
  const product = await findProductById(order.productId);
  await completeCommerceFeatures(updated || order, product);
  const license = await getOrderLicense(
    (updated || order).userId,
    (updated || order).id
  );
  await notifyPaymentReceived(updated || order);
  await sendStoreOrderPaymentEmail({ order: updated || order });
  await sendPurchaseConfirmationEmail({
    order: updated || order,
    deliveryContent: product?.deliveryContent,
    licenseKey: license?.title,
    license,
    // Prefer NEXT_PUBLIC_APP_URL; fallback origin only used if unset.
    requestUrl: "https://paymug.app",
  });
  return true;
}

async function processInvalidCapture(
  input: PayPalWebhookRouteInput
): Promise<boolean> {
  const order = await findOrderForCaptureEvent(input);
  if (
    !order ||
    order.userId !== input.userId ||
    order.environment !== input.mode
  ) {
    return false;
  }

  if (input.event.event_type === "PAYMENT.CAPTURE.DENIED") {
    if (order.status === "paid" || order.status === "refunded") {
      return true;
    }
    const updated = await updateOrder(order.id, { status: "failed" });
    await notifyPaymentFailed({
      order: updated || order,
      paypalStatus: "denied",
    });
    return true;
  }

  const updated =
    order.status === "refunded"
      ? order
      : await updateOrder(order.id, { status: "refunded" });
  const product = await findProductById(order.productId);
  await revokeGitHubOrderAccess(updated || order, product);
  return true;
}

export async function processPayPalOrderAccessWebhook(
  input: PayPalWebhookRouteInput
): Promise<boolean> {
  if (input.event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
    return processCaptureCompleted(input);
  }
  if (!invalidCaptureEvents.has(input.event.event_type)) return false;
  return processInvalidCapture(input);
}
