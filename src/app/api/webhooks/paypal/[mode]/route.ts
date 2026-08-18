import {
  processPayPalSubscriptionWebhook,
  resolvePayPalWebhookUser,
} from "@/lib/paypal-webhooks";
import type { PayPalWebhookEvent } from "@/lib/paypal-webhooks.types";
import type { PayPalMode } from "@/lib/types";
import type { PayPalWebhookRouteContext } from "./route.types";

export async function POST(
  request: Request,
  { params }: PayPalWebhookRouteContext
) {
  const { mode: rawMode } = await params;
  if (rawMode !== "sandbox" && rawMode !== "live") {
    return Response.json({ error: "Invalid PayPal mode" }, { status: 400 });
  }

  try {
    const event = (await request.json()) as PayPalWebhookEvent;
    const userId = await resolvePayPalWebhookUser(
      event,
      rawMode as PayPalMode
    );
    if (!userId) {
      return Response.json(
        { error: "Could not resolve the account for this webhook" },
        { status: 404 }
      );
    }
    const result = await processPayPalSubscriptionWebhook({
      userId,
      mode: rawMode as PayPalMode,
      headers: request.headers,
      event,
    });
    return Response.json(result);
  } catch (error) {
    console.error("PayPal webhook processing failed", {
      mode: rawMode,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not process PayPal webhook",
      },
      { status: 400 }
    );
  }
}
