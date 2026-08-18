import { z } from "zod";
import {
  completeCommerceFeatures,
  getOrderLicense,
} from "@/lib/commerce-features";
import {
  findOrderById,
  findProductById,
  updateOrder,
} from "@/lib/db";
import {
  notifyPaymentFailed,
  notifyPaymentReceived,
} from "@/lib/notification-events";
import { getPayPalCredentials } from "@/lib/payment-credentials";
import { capturePayPalOrder } from "@/lib/paypal";
import {
  sendOrderPaymentFailedEmail,
  sendPurchaseConfirmationEmail,
} from "@/lib/transactional-emails";
import { jsonError } from "@/lib/utils";
import { grantGitHubOrderAccess } from "@/lib/github-access";
import { sendStoreOrderPaymentEmail } from "@/lib/store-notification-emails";

const schema = z.object({
  orderId: z.string().min(1),
  paypalOrderId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || "Invalid input");
    }

    const order = await findOrderById(parsed.data.orderId);
    if (!order) return jsonError("Order not found", 404);

    if (order.status === "paid") {
      const product = await findProductById(order.productId);
      if (
        order.githubUsername &&
        (order.githubAccessStatus === "pending" ||
          order.githubAccessStatus === "error")
      ) {
        await grantGitHubOrderAccess(order, product);
      }
      return Response.json({
        order: {
          id: order.id,
          status: order.status,
          productName: order.productName,
          amount: order.amount,
          currency: order.currency,
          customerEmail: order.customerEmail,
          deliveryContent: product?.deliveryContent,
          paidAt: order.paidAt,
        },
      });
    }

    if (order.paypalOrderId && order.paypalOrderId !== parsed.data.paypalOrderId) {
      return jsonError("PayPal order mismatch", 400);
    }

    const conn = await getPayPalCredentials(
      order.userId,
      order.environment,
      order.storeId
    );
    if (!conn) return jsonError("Seller payment gateway not connected", 400);

    let capture: Awaited<ReturnType<typeof capturePayPalOrder>>;
    try {
      capture = await capturePayPalOrder(
        conn.clientId,
        conn.clientSecret,
        conn.mode,
        parsed.data.paypalOrderId
      );
    } catch (error) {
      await updateOrder(order.id, { status: "failed" });
      await notifyPaymentFailed({
        order,
        paypalStatus: "PayPal rejected the payment",
      });
      await sendOrderPaymentFailedEmail({ order, requestUrl: req.url });
      throw error;
    }

    if (capture.status !== "COMPLETED") {
      await updateOrder(order.id, { status: "failed" });
      await notifyPaymentFailed({
        order,
        paypalStatus: capture.status,
      });
      await sendOrderPaymentFailedEmail({ order, requestUrl: req.url });
      return jsonError(`Payment not completed (status: ${capture.status})`, 400);
    }

    const paidAt = new Date().toISOString();
    const updated = await updateOrder(order.id, {
      status: "paid",
      paypalOrderId: parsed.data.paypalOrderId,
      paypalCaptureId: capture.captureId,
      paidAt,
      customerEmail: order.customerEmail,
      customerName: capture.payerName || order.customerName,
    });

    const product = await findProductById(order.productId);
    await completeCommerceFeatures(updated!, product);
    const license = await getOrderLicense(updated!.userId, updated!.id);
    await notifyPaymentReceived(updated!);
    await sendStoreOrderPaymentEmail({ order: updated! });
    await sendPurchaseConfirmationEmail({
      order: updated!,
      deliveryContent: product?.deliveryContent,
      licenseKey: license?.title,
      license,
      requestUrl: req.url,
    });

    return Response.json({
      order: {
        id: updated!.id,
        status: updated!.status,
        productName: updated!.productName,
        amount: updated!.amount,
        currency: updated!.currency,
        customerEmail: updated!.customerEmail,
        deliveryContent: product?.deliveryContent,
        paidAt: updated!.paidAt,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to capture payment";
    console.error("capture-order error:", message);
    return jsonError(message, 500);
  }
}
