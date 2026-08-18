import { getSessionUser } from "@/lib/auth";
import {
  getStripeEnvStatus,
  getStripeRequiredEnvKeys,
} from "@/lib/payment-credentials";
import { jsonError } from "@/lib/utils";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const requestedMode = new URL(request.url).searchParams.get("mode");
  const mode =
    requestedMode === "live" || requestedMode === "sandbox"
      ? requestedMode
      : user.environment;
  const status = await getStripeEnvStatus(mode);

  return Response.json({
    connected: status.secretKeyConfigured,
    mode,
    webhookConfigured: status.webhookSecretConfigured,
    webhookUrl: new URL(
      `/api/webhooks/stripe/${user.id}/${mode}`,
      request.url
    ).toString(),
    requiredEnvVars: getStripeRequiredEnvKeys(mode),
    configuredEnvVars: status.configuredEnvVars,
    missingEnvVars: status.missingEnvVars,
    // Credentials are configured through environment variables; no secret is returned.
  });
}

export async function POST() {
  return jsonError(
    "Stripe credentials are now configured through environment variables (STRIPE_SANDBOX_SECRET_KEY / STRIPE_SANDBOX_WEBHOOK_SECRET, or the LIVE equivalents). Use the dashboard only to choose the payment provider.",
    400
  );
}

export async function DELETE() {
  return jsonError(
    "Stripe credentials are configured through environment variables and cannot be removed from the dashboard.",
    400
  );
}
