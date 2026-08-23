import { findOrderById, updateOrder } from "./db";
import {
  formatPaymentFailureDetails,
  getPaymentFailureMessage,
} from "./payment-failure.utils";
import type { Order } from "./types";

export async function failStripeOrder(
  orderId: string,
  userId: string,
  environment: Order["environment"],
  payload: unknown,
) {
  const order = await findOrderById(orderId);
  if (
    !order ||
    order.gateway !== "stripe" ||
    order.userId !== userId ||
    order.environment !== environment ||
    order.status === "paid" ||
    order.status === "refunded"
  ) {
    return order;
  }
  const message =
    getPaymentFailureMessage(payload) ||
    "Stripe reported an asynchronous payment failure";
  return updateOrder(order.id, {
    status: "failed",
    paymentFailureDetails: formatPaymentFailureDetails(
      "Stripe",
      message,
      payload,
    ),
  });
}
