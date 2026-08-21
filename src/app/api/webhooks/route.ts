import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { outboundWebhookEventNames } from "@/lib/outbound-webhook-events.config";
import { isAllowedWebhookUrl } from "@/lib/outbound-webhook-url.utils";
import {
  createOutboundWebhook,
  listOutboundWebhookDeliveries,
  listOutboundWebhooks,
} from "@/lib/outbound-webhooks";
import type { OutboundWebhookEventName } from "@/lib/outbound-webhooks.types";
import { jsonError } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  url: z.string().trim().url().max(2_000),
  auth: z.string().trim().max(2_000).optional(),
  events: z.array(z.string()).min(1).max(20),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const webhooks = await listOutboundWebhooks(
    user.id,
    user.activeStoreId,
    user.environment,
  );
  const deliveries = await listOutboundWebhookDeliveries(
    webhooks.map((webhook) => webhook.id),
  );
  return Response.json({ webhooks, deliveries });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid input");
  }
  if (!isAllowedWebhookUrl(parsed.data.url)) {
    return jsonError("Use a valid HTTPS endpoint URL", 400);
  }
  if (
    parsed.data.events.some(
      (event) =>
        event === "webhook_test" || !outboundWebhookEventNames.has(event as OutboundWebhookEventName),
    )
  ) {
    return jsonError("One or more webhook events are invalid", 400);
  }
  const created = await createOutboundWebhook({
    userId: user.id,
    storeId: user.activeStoreId,
    environment: user.environment,
    name: parsed.data.name,
    url: parsed.data.url,
    auth: parsed.data.auth || undefined,
    events: [...new Set(parsed.data.events)] as OutboundWebhookEventName[],
  });
  return Response.json(created, { status: 201 });
}
