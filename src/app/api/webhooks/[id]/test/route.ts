import { getSessionUser } from "@/lib/auth";
import { sendOutboundWebhookTest } from "@/lib/outbound-webhooks";
import { jsonError } from "@/lib/utils";
import type { OutboundWebhookRouteContext } from "../route.types";

export async function POST(
  _request: Request,
  { params }: OutboundWebhookRouteContext,
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const sent = await sendOutboundWebhookTest(
    id,
    user.id,
    user.activeStoreId,
  );
  return sent
    ? Response.json({ sent: true })
    : jsonError("Webhook not found", 404);
}
