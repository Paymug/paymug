import { getSessionUser } from "@/lib/auth";
import { resendOutboundWebhookDelivery } from "@/lib/outbound-webhook-resend";
import { jsonError } from "@/lib/utils";
import type { ResendWebhookDeliveryRouteContext } from "./route.types";

export async function POST(
  _request: Request,
  { params }: ResendWebhookDeliveryRouteContext,
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const sent = await resendOutboundWebhookDelivery(
    id,
    user.id,
    user.activeStoreId,
    user.environment,
  );
  return sent
    ? Response.json({ sent: true })
    : jsonError("Webhook delivery not found", 404);
}
