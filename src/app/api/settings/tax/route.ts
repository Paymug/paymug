import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getStripeCredentials } from "@/lib/payment-credentials";
import { getStoreById, updateStore } from "@/lib/stores";
import { retrieveStripeTaxSettings } from "@/lib/stripe";
import { jsonError } from "@/lib/utils";

const schema = z.object({ stripeTaxEnabled: z.boolean() });

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const store = await getStoreById(user.activeStoreId, user.id);
  if (!store) return jsonError("Store not found", 404);
  const connection = await getStripeCredentials(
    user.id,
    user.environment,
    store.id
  );
  if (!connection) {
    return Response.json({
      stripeConfigured: false,
      mode: user.environment,
      enabled: false,
    });
  }
  let taxStatus: "active" | "pending" | "unknown" = "unknown";
  let originCountry: string | undefined;
  let taxError: string | undefined;
  try {
    const settings = await retrieveStripeTaxSettings(connection.secretKey);
    taxStatus = settings.status;
    originCountry = settings.head_office?.address?.country ?? undefined;
  } catch (error) {
    taxError =
      error instanceof Error ? error.message : "Could not read Stripe Tax";
  }
  return Response.json({
    stripeConfigured: true,
    mode: connection.mode,
    enabled: store.stripeTaxEnabled,
    paymentGateway: store.paymentGateway,
    taxStatus,
    originCountry,
    taxError,
  });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Invalid settings");
  if (parsed.data.stripeTaxEnabled) {
    const connection = await getStripeCredentials(
      user.id,
      user.environment,
      user.activeStoreId
    );
    if (!connection) {
      return jsonError("Configure Stripe before enabling Stripe Tax", 409);
    }
  }
  const store = await updateStore(user.activeStoreId, user.id, {
    stripeTaxEnabled: parsed.data.stripeTaxEnabled,
  });
  if (!store) return jsonError("Store not found", 404);
  return Response.json({ enabled: store.stripeTaxEnabled });
}
