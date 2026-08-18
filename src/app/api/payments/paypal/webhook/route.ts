import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getPayPalCredentials } from "@/lib/payment-credentials";
import {
  ensurePayPalSubscriptionWebhook,
  PAYPAL_APP_WEBHOOK_EVENTS,
} from "@/lib/paypal-webhooks";
import { reconcilePayPalSubscriptionsForMode } from "@/lib/paypal-subscription-reconciliation";
import { jsonError } from "@/lib/utils";

const setupSchema = z.object({
  mode: z.enum(["sandbox", "live"]),
});

/**
 * Automatically creates or updates the PayPal webhook for this mode so the app
 * receives payment, refund, and subscription lifecycle events.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);

  const parsed = setupSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError("Invalid mode");

  const connection = await getPayPalCredentials(user.id, parsed.data.mode);
  if (!connection) {
    return jsonError(
      `PayPal ${parsed.data.mode} credentials are not configured in the environment`,
      400
    );
  }

  try {
    const webhookSetup = await ensurePayPalSubscriptionWebhook({
      userId: user.id,
      mode: parsed.data.mode,
      clientId: connection.clientId,
      clientSecret: connection.clientSecret,
      requestUrl: req.url,
    });
    const reconciliation =
      webhookSetup.webhookStatus === "active"
        ? await reconcilePayPalSubscriptionsForMode({
            userId: user.id,
            mode: parsed.data.mode,
          })
        : { checked: 0, reconciled: 0, failed: 0 };
    return Response.json({
      ...webhookSetup,
      eventTypes: [...PAYPAL_APP_WEBHOOK_EVENTS],
      reconciliation,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Could not configure the PayPal webhook",
      400
    );
  }
}
