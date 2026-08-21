import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { outboundWebhookEventNames } from "@/lib/outbound-webhook-events.config";
import { isAllowedWebhookUrl } from "@/lib/outbound-webhook-url.utils";
import {
  deleteOutboundWebhook,
  getOutboundWebhook,
  updateOutboundWebhook,
} from "@/lib/outbound-webhooks";
import type { OutboundWebhookEventName } from "@/lib/outbound-webhooks.types";
import { jsonError } from "@/lib/utils";
import type { OutboundWebhookRouteContext } from "./route.types";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  url: z.string().trim().url().max(2_000).optional(),
  auth: z.union([z.string().trim().max(2_000), z.null()]).optional(),
  events: z.array(z.string()).min(1).max(20).optional(),
  status: z.enum(["active", "paused"]).optional(),
});

export async function GET(
  _request: Request,
  { params }: OutboundWebhookRouteContext,
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const webhook = await getOutboundWebhook(
    id,
    user.id,
    user.activeStoreId,
    user.environment,
  );
  return webhook
    ? Response.json({ webhook })
    : jsonError("Webhook not found", 404);
}

export async function PATCH(
  request: Request,
  { params }: OutboundWebhookRouteContext,
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid input");
  }
  if (parsed.data.url && !isAllowedWebhookUrl(parsed.data.url)) {
    return jsonError("Use a valid HTTPS endpoint URL", 400);
  }
  if (
    parsed.data.events?.some(
      (event) =>
        event === "webhook_test" || !outboundWebhookEventNames.has(event as OutboundWebhookEventName),
    )
  ) {
    return jsonError("One or more webhook events are invalid", 400);
  }
  const { id } = await params;
  const webhook = await updateOutboundWebhook(
    id,
    user.id,
    user.activeStoreId,
    user.environment,
    {
      ...parsed.data,
      events: parsed.data.events
        ? ([...new Set(parsed.data.events)] as OutboundWebhookEventName[])
        : undefined,
    },
  );
  return webhook
    ? Response.json({ webhook })
    : jsonError("Webhook not found", 404);
}

export async function DELETE(
  _request: Request,
  { params }: OutboundWebhookRouteContext,
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const deleted = await deleteOutboundWebhook(
    id,
    user.id,
    user.activeStoreId,
  );
  return deleted
    ? Response.json({ deleted: true })
    : jsonError("Webhook not found", 404);
}
