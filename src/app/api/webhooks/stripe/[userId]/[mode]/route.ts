import { getStripeCredentials } from "@/lib/payment-credentials";
import { completeStripeOrder } from "@/lib/stripe-order";
import { parseVerifiedStripeWebhook } from "@/lib/stripe-webhooks";
import type { PayPalMode } from "@/lib/types";
import type { StripeWebhookRouteContext } from "./route.types";

export async function POST(
  request: Request,
  { params }: StripeWebhookRouteContext
) {
  const { userId, mode: rawMode } = await params;
  if (rawMode !== "sandbox" && rawMode !== "live") {
    return Response.json({ error: "Invalid mode" }, { status: 400 });
  }
  const connection = await getStripeCredentials(
    userId,
    rawMode as PayPalMode
  );
  if (!connection?.webhookSecret) {
    return Response.json(
      { error: "Stripe webhook is not configured" },
      { status: 404 }
    );
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing Stripe signature" }, { status: 400 });
  }
  try {
    const payload = await request.text();
    const event = parseVerifiedStripeWebhook(
      payload,
      signature,
      connection.webhookSecret
    );
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object;
      const orderId =
        session.metadata.orderId || session.client_reference_id;
      if (!orderId) throw new Error("Stripe event has no order reference");
      if (session.payment_status !== "unpaid") {
        await completeStripeOrder(orderId, session.id, request.url);
      }
    }
    return Response.json({ received: true });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not process Stripe webhook",
      },
      { status: 400 }
    );
  }
}
