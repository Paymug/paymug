import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  notifications as notificationsTable,
  users as usersTable,
} from "@/db/schema";
import { uid } from "./utils";
import type {
  CreateNotificationInput,
  NotificationRecord,
  NotificationType,
} from "./notifications.types";

function mapNotification(
  row: typeof notificationsTable.$inferSelect
): NotificationRecord {
  return {
    id: row.id,
    userId: row.userId,
    environment: row.environment,
    type: row.type as NotificationType,
    title: row.title,
    message: row.message ?? undefined,
    href: row.href ?? undefined,
    sourceKey: row.sourceKey,
    readAt: row.readAt ?? undefined,
    createdAt: row.createdAt,
  };
}

export async function listNotifications(
  userId: string,
  limit = 12,
  environment?: NotificationRecord["environment"]
): Promise<NotificationRecord[]> {
  const db = await getDb();
  const rows = await db.query.notifications.findMany({
    where: and(
      eq(notificationsTable.userId, userId),
      ...(environment
        ? [eq(notificationsTable.environment, environment)]
        : [])
    ),
    orderBy: [desc(notificationsTable.createdAt)],
    limit,
  });
  return rows.map(mapNotification);
}

export async function hasUnreadNotifications(
  userId: string,
  environment?: NotificationRecord["environment"]
) {
  const db = await getDb();
  const row = await db.query.notifications.findFirst({
    columns: { id: true },
    where: and(
      eq(notificationsTable.userId, userId),
      ...(environment
        ? [eq(notificationsTable.environment, environment)]
        : []),
      isNull(notificationsTable.readAt)
    ),
  });
  return Boolean(row);
}

export async function createNotification(
  userId: string,
  input: CreateNotificationInput
) {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = uid();
  const environment =
    input.environment ||
    (
      await db.query.users.findFirst({
        columns: { environment: true },
        where: eq(usersTable.id, userId),
      })
    )?.environment ||
    "sandbox";
  await db
    .insert(notificationsTable)
    .values({
      id,
      userId,
      environment,
      type: input.type,
      title: input.title,
      message: input.message ?? null,
      href: input.href ?? null,
      sourceKey: input.sourceKey,
      createdAt: now,
    })
    .onConflictDoNothing();
}

export async function createNotificationSafely(
  userId: string,
  input: CreateNotificationInput
) {
  try {
    await createNotification(userId, input);
  } catch (error) {
    console.error("notification creation failed", error);
  }
}

export async function markAllNotificationsRead(
  userId: string,
  environment?: NotificationRecord["environment"]
) {
  const db = await getDb();
  await db
    .update(notificationsTable)
    .set({ readAt: new Date().toISOString() })
    .where(
      and(
        eq(notificationsTable.userId, userId),
        ...(environment
          ? [eq(notificationsTable.environment, environment)]
          : []),
        isNull(notificationsTable.readAt)
      )
    );
}
