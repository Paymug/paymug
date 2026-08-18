import {
  completeCommerceFeatures,
  getOrderLicense,
} from "./commerce-features";
import {
  findOrderById,
  findProductById,
  updateOrder,
} from "./db";
import { grantGitHubOrderAccess } from "./github-access";
import { getStripeCredentials } from "./payment-credentials";
import { notifyPaymentReceived } from "./notification-events";
import { retrieveStripeCheckoutSession } from "./stripe";
import { sendStoreOrderPaymentEmail } from "./store-notification-emails";
import { sendPurchaseConfirmationEmail } from "./transactional-emails";

export async function completeStripeOrder(
  orderId: string,
  sessionId: string,
  requestUrl: string
) {
  const order = await findOrderById(orderId);
  if (!order || order.gateway !== "stripe") throw new Error("Order not found");
  if (
    order.stripeCheckoutSessionId &&
    order.stripeCheckoutSessionId !== sessionId
  ) {
    throw new Error("Stripe Checkout Session mismatch");
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
  const connection = await getStripeCredentials(
    order.userId,
    order.environment,
    order.storeId
  );
  if (!connection) throw new Error("Seller payment gateway not connected");
  const session = await retrieveStripeCheckoutSession(
    connection.secretKey,
    sessionId
  );
  if (
    session.client_reference_id !== order.id ||
    session.metadata.orderId !== order.id
  ) {
    throw new Error("Stripe order reference mismatch");
  }
  if (
    session.amount_total !== order.amount ||
    session.currency?.toUpperCase() !== order.currency.toUpperCase()
  ) {
    throw new Error("Stripe payment amount mismatch");
  }
  if (
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    throw new Error(`Stripe payment is ${session.payment_status}`);
  }
  const updated = await updateOrder(order.id, {
    status: "paid",
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: session.payment_intent || undefined,
    customerName: session.customer_details?.name || order.customerName,
    paidAt: new Date().toISOString(),
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
