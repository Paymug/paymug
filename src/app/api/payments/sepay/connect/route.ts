import { getSessionUser } from "@/lib/auth";
import {
  getSepayEnvStatus,
  getSepayRequiredEnvKeys,
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
  const status = await getSepayEnvStatus(mode);

  return Response.json({
    connected: status.credentialsConfigured,
    mode,
    webhookConfigured: status.ipnSecretConfigured,
    webhookUrl: new URL(
      `/api/webhooks/sepay/${user.id}/${mode}`,
      request.url
    ).toString(),
    requiredEnvVars: getSepayRequiredEnvKeys(mode),
    configuredEnvVars: status.configuredEnvVars,
    missingEnvVars: status.missingEnvVars,
    // Credentials are configured through environment variables; no secret is returned.
  });
}

export async function POST() {
  return jsonError(
    "SePay credentials are configured through environment variables (SEPAY_SANDBOX_MERCHANT_ID / SEPAY_SANDBOX_SECRET_KEY / SEPAY_SANDBOX_IPN_SECRET, or the LIVE equivalents). Use the dashboard only to choose the payment provider.",
    400
  );
}

export async function DELETE() {
  return jsonError(
    "SePay credentials are configured through environment variables and cannot be removed from the dashboard.",
    400
  );
}
