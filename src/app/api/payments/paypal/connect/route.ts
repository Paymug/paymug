import { getSessionUser } from "@/lib/auth";
import {
  getPayPalCredentials,
  getPayPalEnvStatus,
  getPayPalRequiredEnvKeys,
} from "@/lib/payment-credentials";
import {
  getPayPalSubscriptionWebhookUrl,
  getPayPalWebhookConfiguration,
} from "@/lib/paypal-webhooks";
import { jsonError } from "@/lib/utils";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);

  const requestedMode = new URL(req.url).searchParams.get("mode");
  const mode =
    requestedMode === "live" || requestedMode === "sandbox"
      ? requestedMode
      : user.environment;
  const [connection, envStatus] = await Promise.all([
    getPayPalCredentials(user.id, mode),
    getPayPalEnvStatus(mode),
  ]);
  const expectedWebhookUrl = getPayPalSubscriptionWebhookUrl(
    user.id,
    mode,
    req.url
  );
  const webhook = await getPayPalWebhookConfiguration({
    userId: user.id,
    mode,
  });

  return Response.json({
    connected: Boolean(connection),
    clientId: connection?.clientId,
    mode,
    webhookId: webhook?.id,
    webhookUrl: webhook?.url || expectedWebhookUrl,
    webhookStatus: webhook ? "active" : "not_configured",
    requiredEnvVars: getPayPalRequiredEnvKeys(mode),
    configuredEnvVars: envStatus.configuredEnvVars,
    missingEnvVars: envStatus.missingEnvVars,
    // Credentials are configured through environment variables; no secret is returned.
  });
}

export async function POST() {
  return jsonError(
    "PayPal credentials are now configured through environment variables (PAYPAL_SANDBOX_CLIENT_ID / PAYPAL_SANDBOX_CLIENT_SECRET, or the LIVE equivalents). Use the dashboard only to choose the payment provider.",
    400
  );
}

export async function PATCH() {
  return jsonError(
    "The PayPal webhook is created and updated automatically from the dashboard.",
    400
  );
}

export async function DELETE() {
  return jsonError(
    "PayPal credentials are configured through environment variables and cannot be removed from the dashboard.",
    400
  );
}
