import {
  completeCommerceFeatures,
  getOrderLicense,
} from "./commerce-features";
import { findOrderById, findProductById, updateOrder } from "./db";
import { grantGitHubOrderAccess } from "./github-access";
import { notifyPaymentReceived } from "./notification-events";
import {
  formatPaymentFailureDetails,
  getPaymentFailureMessage,
} from "./payment-failure.utils";
import { SEPAY_CURRENCY, toSepayAmount } from "./sepay";
import type { SepayIpnPayload } from "./sepay.types";
import { sendStoreOrderPaymentEmail } from "./store-notification-emails";
import { sendPurchaseConfirmationEmail } from "./transactional-emails";
import type { Order } from "./types";

export async function completeSepayOrder(
  payload: SepayIpnPayload,
  userId: string,
  environment: Order["environment"],
  requestUrl: string
) {
  const orderId = payload.order.order_invoice_number;
  if (!orderId) throw new Error("SePay IPN has no order reference");
  const order = await findOrderById(orderId);
  if (
    !order ||
    order.gateway !== "sepay" ||
    order.userId !== userId ||
    order.environment !== environment
  ) {
    throw new Error("Order not found");
  }
  if (order.status === "paid") {
    const product = await findProductById(order.productId);
    if (
      order.githubUsername &&
      (order.githubAccessStatus === "pending" ||
        order.githubAccessStatus === "error")
    ) {
      await grantGitHubOrderAccess(order, product);
    }
    return order;
  }
  if (payload.order.order_status !== "CAPTURED") {
    throw new Error(`SePay order is ${payload.order.order_status ?? "unknown"}`);
  }
  if (payload.order.order_currency?.toUpperCase() !== SEPAY_CURRENCY) {
    throw new Error("SePay payment currency mismatch");
  }
  if (Number(payload.order.order_amount) !== toSepayAmount(order.amount)) {
    throw new Error("SePay payment amount mismatch");
  }
  const updated = await updateOrder(order.id, {
    status: "paid",
    paidAt: new Date().toISOString(),
    paymentFailureDetails: null,
  });
  if (!updated) throw new Error("Could not update order");
  const product = await findProductById(order.productId);
  await completeCommerceFeatures(updated, product);
  const license = await getOrderLicense(updated.userId, updated.id);
  await notifyPaymentReceived(updated);
  await sendStoreOrderPaymentEmail({ order: updated });
  await sendPurchaseConfirmationEmail({
    order: updated,
    deliveryContent: product?.deliveryContent,
    licenseKey: license?.title,
    license,
    requestUrl,
  });
  return updated;
}

export async function voidSepayOrder(
  payload: SepayIpnPayload,
  userId: string,
  environment: Order["environment"]
) {
  const orderId = payload.order.order_invoice_number;
  if (!orderId) throw new Error("SePay IPN has no order reference");
  const order = await findOrderById(orderId);
  if (
    !order ||
    order.gateway !== "sepay" ||
    order.userId !== userId ||
    order.environment !== environment ||
    order.status === "paid" ||
    order.status === "refunded"
  ) {
    return order;
  }
  const message =
    getPaymentFailureMessage(payload) || "SePay voided the transaction";
  return updateOrder(order.id, {
    status: "failed",
    paymentFailureDetails: formatPaymentFailureDetails(
      "SePay",
      message,
      payload
    ),
  });
}
