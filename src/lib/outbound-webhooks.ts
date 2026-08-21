import "server-only";

import { createHmac, randomBytes } from "crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  webhookDeliveries as deliveriesTable,
  webhooks as webhooksTable,
} from "@/db/schema";
import { decryptSecret, encryptSecret } from "./crypto";
import { uid } from "./utils";
import type {
  CreatedOutboundWebhook,
  CreateOutboundWebhookInput,
  DispatchOutboundWebhookInput,
  OutboundWebhookDeliveryRecord,
  OutboundWebhookEventName,
  OutboundWebhookRecord,
  UpdateOutboundWebhookInput,
} from "./outbound-webhooks.types";

const maxResponseLength = 16_000;

function parseEvents(value: string): OutboundWebhookEventName[] {
  try {
    return JSON.parse(value) as OutboundWebhookEventName[];
  } catch {
    return [];
  }
}

function mapWebhook(
  row: typeof webhooksTable.$inferSelect,
): OutboundWebhookRecord {
  return {
    id: row.id,
    userId: row.userId,
    storeId: row.storeId,
    environment: row.environment,
    name: row.name,
    url: row.url,
    authConfigured: Boolean(row.authEncrypted),
    events: parseEvents(row.events),
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapDelivery(
  row: typeof deliveriesTable.$inferSelect,
): OutboundWebhookDeliveryRecord {
  return {
    id: row.id,
    webhookId: row.webhookId,
    eventName: row.eventName as OutboundWebhookEventName,
    status: row.status,
    requestBody: row.requestBody,
    responseStatus: row.responseStatus ?? undefined,
    responseBody: row.responseBody ?? undefined,
    error: row.error ?? undefined,
    durationMs: row.durationMs ?? undefined,
    createdAt: row.createdAt,
    completedAt: row.completedAt ?? undefined,
  };
}

export async function listOutboundWebhooks(
  userId: string,
  storeId: string,
  environment: OutboundWebhookRecord["environment"],
): Promise<OutboundWebhookRecord[]> {
  const db = await getDb();
  const rows = await db.query.webhooks.findMany({
    where: and(
      eq(webhooksTable.userId, userId),
      eq(webhooksTable.storeId, storeId),
      eq(webhooksTable.environment, environment),
    ),
    orderBy: [desc(webhooksTable.createdAt)],
  });
  return rows.map(mapWebhook);
}

export async function getOutboundWebhook(
  id: string,
  userId: string,
  storeId: string,
  environment: OutboundWebhookRecord["environment"],
): Promise<OutboundWebhookRecord | undefined> {
  const db = await getDb();
  const row = await db.query.webhooks.findFirst({
    where: and(
      eq(webhooksTable.id, id),
      eq(webhooksTable.userId, userId),
      eq(webhooksTable.storeId, storeId),
      eq(webhooksTable.environment, environment),
    ),
  });
  return row ? mapWebhook(row) : undefined;
}

export async function listOutboundWebhookDeliveries(
  webhookIds: string[],
  limit = 50,
): Promise<OutboundWebhookDeliveryRecord[]> {
  if (webhookIds.length === 0) return [];
  const db = await getDb();
  const rows = await db.query.webhookDeliveries.findMany({
    where: inArray(deliveriesTable.webhookId, webhookIds),
    orderBy: [desc(deliveriesTable.createdAt)],
    limit,
  });
  return rows.map(mapDelivery);
}

export async function createOutboundWebhook(
  input: CreateOutboundWebhookInput,
): Promise<CreatedOutboundWebhook> {
  const db = await getDb();
  const id = uid();
  const secret = `whsec_${randomBytes(24).toString("base64url")}`;
  const now = new Date().toISOString();
  await db.insert(webhooksTable).values({
    id,
    userId: input.userId,
    storeId: input.storeId,
    environment: input.environment,
    name: input.name,
    url: input.url,
    authEncrypted: input.auth ? await encryptSecret(input.auth) : null,
    secretEncrypted: await encryptSecret(secret),
    events: JSON.stringify(input.events),
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  const row = await db.query.webhooks.findFirst({
    where: eq(webhooksTable.id, id),
  });
  return { webhook: mapWebhook(row!), secret };
}

export async function updateOutboundWebhook(
  id: string,
  userId: string,
  storeId: string,
  environment: OutboundWebhookRecord["environment"],
  input: UpdateOutboundWebhookInput,
): Promise<OutboundWebhookRecord | undefined> {
  const db = await getDb();
  const authEncrypted =
    input.auth === undefined
      ? undefined
      : input.auth
        ? await encryptSecret(input.auth)
        : null;
  await db
    .update(webhooksTable)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.url !== undefined ? { url: input.url } : {}),
      ...(authEncrypted !== undefined ? { authEncrypted } : {}),
      ...(input.events !== undefined
        ? { events: JSON.stringify(input.events) }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(webhooksTable.id, id),
        eq(webhooksTable.userId, userId),
        eq(webhooksTable.storeId, storeId),
        eq(webhooksTable.environment, environment),
      ),
    );
  const row = await db.query.webhooks.findFirst({
    where: and(
      eq(webhooksTable.id, id),
      eq(webhooksTable.userId, userId),
      eq(webhooksTable.storeId, storeId),
      eq(webhooksTable.environment, environment),
    ),
  });
  return row ? mapWebhook(row) : undefined;
}

export async function deleteOutboundWebhook(
  id: string,
  userId: string,
  storeId: string,
): Promise<boolean> {
  const db = await getDb();
  const deleted = await db
    .delete(webhooksTable)
    .where(
      and(
        eq(webhooksTable.id, id),
        eq(webhooksTable.userId, userId),
        eq(webhooksTable.storeId, storeId),
      ),
    )
    .returning({ id: webhooksTable.id });
  return deleted.length > 0;
}

async function deliverWebhook(
  webhookRow: typeof webhooksTable.$inferSelect,
  eventName: OutboundWebhookEventName,
  data: DispatchOutboundWebhookInput["data"],
): Promise<void> {
  const db = await getDb();
  const deliveryId = uid();
  const createdAt = new Date().toISOString();
  const body = JSON.stringify({
    meta: {
      event_name: eventName,
      test_mode: webhookRow.environment === "sandbox",
      webhook_id: webhookRow.id,
    },
    data,
  });
  await db.insert(deliveriesTable).values({
    id: deliveryId,
    webhookId: webhookRow.id,
    eventName,
    status: "pending",
    requestBody: body,
    createdAt,
  });

  const startedAt = Date.now();
  try {
    const secret = await decryptSecret(webhookRow.secretEncrypted);
    const auth = webhookRow.authEncrypted
      ? await decryptSecret(webhookRow.authEncrypted)
      : undefined;
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    const response = await fetch(webhookRow.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Paymug-Webhooks/1.0",
        "X-Event-Name": eventName,
        "X-Signature": signature,
        ...(auth ? { Authorization: auth } : {}),
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    const responseBody = (await response.text()).slice(0, maxResponseLength);
    await db
      .update(deliveriesTable)
      .set({
        status: response.ok ? "success" : "failed",
        responseStatus: response.status,
        responseBody,
        durationMs: Date.now() - startedAt,
        completedAt: new Date().toISOString(),
      })
      .where(eq(deliveriesTable.id, deliveryId));
  } catch (error) {
    await db
      .update(deliveriesTable)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "Delivery failed",
        durationMs: Date.now() - startedAt,
        completedAt: new Date().toISOString(),
      })
      .where(eq(deliveriesTable.id, deliveryId));
  }
}

export async function dispatchOutboundWebhookEvent(
  input: DispatchOutboundWebhookInput,
): Promise<void> {
  try {
    const db = await getDb();
    const rows = await db.query.webhooks.findMany({
      where: and(
        eq(webhooksTable.userId, input.userId),
        eq(webhooksTable.storeId, input.storeId),
        eq(webhooksTable.environment, input.environment),
        eq(webhooksTable.status, "active"),
      ),
    });
    const subscribed = rows.filter((row) =>
      parseEvents(row.events).includes(input.eventName),
    );
    await Promise.all(
      subscribed.map((row) => deliverWebhook(row, input.eventName, input.data)),
    );
  } catch (error) {
    console.error("Outbound webhook dispatch failed", error);
  }
}

export async function sendOutboundWebhookTest(
  id: string,
  userId: string,
  storeId: string,
): Promise<boolean> {
  const db = await getDb();
  const row = await db.query.webhooks.findFirst({
    where: and(
      eq(webhooksTable.id, id),
      eq(webhooksTable.userId, userId),
      eq(webhooksTable.storeId, storeId),
    ),
  });
  if (!row) return false;
  await deliverWebhook(row, "webhook_test", {
    id: uid(),
    message: "This is a test webhook from Paymug.",
    created_at: new Date().toISOString(),
  });
  return true;
}
