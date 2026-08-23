import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  webhookDeliveries as deliveriesTable,
  webhooks as webhooksTable,
} from "@/db/schema";
import { deliverWebhook } from "./outbound-webhooks";
import type {
  OutboundWebhookEventName,
  OutboundWebhookRecord,
} from "./outbound-webhooks.types";
import { normalizeLegacyWebhookRequestBody } from "./outbound-webhook-payload.utils";

export async function resendOutboundWebhookDelivery(
  deliveryId: string,
  userId: string,
  storeId: string,
  environment: OutboundWebhookRecord["environment"],
): Promise<boolean> {
  const db = await getDb();
  const delivery = await db.query.webhookDeliveries.findFirst({
    where: eq(deliveriesTable.id, deliveryId),
  });
  if (!delivery) return false;

  const webhook = await db.query.webhooks.findFirst({
    where: and(
      eq(webhooksTable.id, delivery.webhookId),
      eq(webhooksTable.userId, userId),
      eq(webhooksTable.storeId, storeId),
      eq(webhooksTable.environment, environment),
    ),
  });
  if (!webhook) return false;

  await deliverWebhook(
    webhook,
    delivery.eventName as OutboundWebhookEventName,
    {},
    normalizeLegacyWebhookRequestBody(delivery.requestBody),
  );
  return true;
}
