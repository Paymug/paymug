import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  updateUser,
} from "@/lib/db";
import { getPayPalCredentials, getStripeCredentials } from "@/lib/payment-credentials";
import { jsonError } from "@/lib/utils";
import { getStoreById } from "@/lib/stores";

const environmentSchema = z.object({
  environment: z.enum(["sandbox", "live"]),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);

  const parsed = environmentSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError("Invalid environment");

  const { environment } = parsed.data;
  const [store, paypal, stripe] = await Promise.all([
    getStoreById(user.activeStoreId, user.id),
    getPayPalCredentials(user.id, environment, user.activeStoreId),
    getStripeCredentials(user.id, environment, user.activeStoreId),
  ]);

  const selectedConnection =
    store?.paymentGateway === "stripe" ? stripe : paypal;
  if (!selectedConnection) {
    const label = environment === "live" ? "live" : "sandbox";
    const provider =
      store?.paymentGateway === "stripe" ? "Stripe" : "PayPal";
    return jsonError(
      `${provider} ${label} credentials are required before switching environments.`,
      409
    );
  }

  await updateUser(user.id, { environment });
  return Response.json({ environment });
}
