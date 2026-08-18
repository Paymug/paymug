import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  apiKeys as apiKeysTable,
  featureRecords as featureRecordsTable,
  users as usersTable,
} from "@/db/schema";
import type {
  ApiKeyRecord,
  DashboardFeatureKey,
  FeatureRecord,
  FeatureRecordInput,
} from "./feature-records.types";
import { uid } from "./utils";

function parseFeatureData(
  value: string
): FeatureRecord["data"] {
  try {
    return JSON.parse(value) as FeatureRecord["data"];
  } catch {
    return {};
  }
}

function mapFeatureRecord(
  row: typeof featureRecordsTable.$inferSelect
): FeatureRecord {
  return {
    id: row.id,
    userId: row.userId,
    environment: row.environment,
    feature: row.feature as DashboardFeatureKey,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    status: row.status,
    data: parseFeatureData(row.data),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapApiKey(row: typeof apiKeysTable.$inferSelect): ApiKeyRecord {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    keyPrefix: row.keyPrefix,
    lastUsedAt: row.lastUsedAt ?? undefined,
    expiresAt: row.expiresAt ?? undefined,
    revokedAt: row.revokedAt ?? undefined,
    createdAt: row.createdAt,
  };
}

export async function listFeatureRecords(
  userId: string,
  feature: DashboardFeatureKey,
  environment?: FeatureRecord["environment"]
): Promise<FeatureRecord[]> {
  const db = await getDb();
  const rows = await db.query.featureRecords.findMany({
    where: and(
      eq(featureRecordsTable.userId, userId),
      eq(featureRecordsTable.feature, feature),
      ...(environment
        ? [eq(featureRecordsTable.environment, environment)]
        : [])
    ),
    orderBy: [desc(featureRecordsTable.createdAt)],
  });
  return rows.map(mapFeatureRecord);
}

export async function findFeatureRecord(
  id: string,
  userId?: string
): Promise<FeatureRecord | undefined> {
  const db = await getDb();
  const row = await db.query.featureRecords.findFirst({
    where: userId
      ? and(
          eq(featureRecordsTable.id, id),
          eq(featureRecordsTable.userId, userId)
        )
      : eq(featureRecordsTable.id, id),
  });
  return row ? mapFeatureRecord(row) : undefined;
}

export async function findFeatureRecordByTitle(
  userId: string,
  feature: DashboardFeatureKey,
  title: string,
  environment?: FeatureRecord["environment"]
): Promise<FeatureRecord | undefined> {
  const db = await getDb();
  const row = await db.query.featureRecords.findFirst({
    where: and(
      eq(featureRecordsTable.userId, userId),
      eq(featureRecordsTable.feature, feature),
      eq(featureRecordsTable.title, title),
      ...(environment
        ? [eq(featureRecordsTable.environment, environment)]
        : [])
    ),
  });
  return row ? mapFeatureRecord(row) : undefined;
}

export async function findFeatureRecordBySubtitle(
  userId: string,
  feature: DashboardFeatureKey,
  subtitle: string,
  environment?: FeatureRecord["environment"]
): Promise<FeatureRecord | undefined> {
  const db = await getDb();
  const row = await db.query.featureRecords.findFirst({
    where: and(
      eq(featureRecordsTable.userId, userId),
      eq(featureRecordsTable.feature, feature),
      eq(featureRecordsTable.subtitle, subtitle),
      ...(environment
        ? [eq(featureRecordsTable.environment, environment)]
        : [])
    ),
  });
  return row ? mapFeatureRecord(row) : undefined;
}

export async function findFeatureRecordByDataValue(
  feature: DashboardFeatureKey,
  key: string,
  value: string,
  environment?: FeatureRecord["environment"]
): Promise<FeatureRecord | undefined> {
  const db = await getDb();
  const rows = await db.query.featureRecords.findMany({
    where: and(
      eq(featureRecordsTable.feature, feature),
      ...(environment
        ? [eq(featureRecordsTable.environment, environment)]
        : [])
    ),
  });
  for (const row of rows) {
    const record = mapFeatureRecord(row);
    if (String(record.data[key] ?? "") === value) return record;
  }
  return undefined;
}

export async function createFeatureRecord(
  userId: string,
  feature: DashboardFeatureKey,
  input: FeatureRecordInput
): Promise<FeatureRecord> {
  const db = await getDb();
  const now = new Date().toISOString();
  const createdAt = input.createdAt || now;
  const environment =
    input.environment ||
    (input.data?.environment === "live" ? "live" : undefined) ||
    (input.data?.environment === "sandbox" ? "sandbox" : undefined) ||
    (
      await db.query.users.findFirst({
        columns: { environment: true },
        where: eq(usersTable.id, userId),
      })
    )?.environment ||
    "sandbox";
  const id = uid();
  await db.insert(featureRecordsTable).values({
    id,
    userId,
    environment,
    feature,
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || null,
    status: input.status || "active",
    data: JSON.stringify(input.data || {}),
    createdAt,
    updatedAt: now,
  });
  return (await findFeatureRecord(id, userId))!;
}

export async function updateFeatureRecord(
  id: string,
  userId: string,
  input: Partial<FeatureRecordInput>
): Promise<FeatureRecord | undefined> {
  const db = await getDb();
  await db
    .update(featureRecordsTable)
    .set({
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.subtitle !== undefined
        ? { subtitle: input.subtitle.trim() || null }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.data !== undefined
        ? { data: JSON.stringify(input.data) }
        : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(featureRecordsTable.id, id),
        eq(featureRecordsTable.userId, userId)
      )
    );
  return findFeatureRecord(id, userId);
}

export async function deleteFeatureRecord(
  id: string,
  userId: string
): Promise<boolean> {
  const db = await getDb();
  const deleted = await db
    .delete(featureRecordsTable)
    .where(
      and(
        eq(featureRecordsTable.id, id),
        eq(featureRecordsTable.userId, userId)
      )
    )
    .returning({ id: featureRecordsTable.id });
  return deleted.length > 0;
}

export async function listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  const db = await getDb();
  const rows = await db.query.apiKeys.findMany({
    where: eq(apiKeysTable.userId, userId),
    orderBy: [desc(apiKeysTable.createdAt)],
  });
  return rows.map(mapApiKey);
}

export async function insertApiKey(input: {
  userId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  expiresAt?: string;
}): Promise<ApiKeyRecord> {
  const db = await getDb();
  const id = uid();
  await db.insert(apiKeysTable).values({
    id,
    userId: input.userId,
    name: input.name,
    keyPrefix: input.keyPrefix,
    keyHash: input.keyHash,
    expiresAt: input.expiresAt || null,
    createdAt: new Date().toISOString(),
  });
  const row = await db.query.apiKeys.findFirst({
    where: eq(apiKeysTable.id, id),
  });
  return mapApiKey(row!);
}

export async function revokeApiKey(
  id: string,
  userId: string
): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .update(apiKeysTable)
    .set({ revokedAt: new Date().toISOString() })
    .where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.userId, userId)))
    .returning({ id: apiKeysTable.id });
  return result.length > 0;
}

export async function findApiKeyByHash(
  keyHash: string
): Promise<ApiKeyRecord | undefined> {
  const db = await getDb();
  const row = await db.query.apiKeys.findFirst({
    where: eq(apiKeysTable.keyHash, keyHash),
  });
  if (!row || row.revokedAt) return undefined;
  if (row.expiresAt && new Date(row.expiresAt) <= new Date()) return undefined;
  await db
    .update(apiKeysTable)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(apiKeysTable.id, row.id));
  return mapApiKey(row);
}
