import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { appMeta } from "@/db/schema";
import type {
  TablePreference,
  TablePreferences,
} from "./table-preferences.types";

function tablePreferencesKey(userId: string) {
  return `table-preferences:${userId}`;
}

function sanitizePreference(value: unknown): TablePreference {
  const input = (value ?? {}) as Partial<TablePreference>;
  const hidden = Array.isArray(input.hidden)
    ? input.hidden.filter((id): id is string => typeof id === "string")
    : [];
  const widths: Record<string, number> = {};
  for (const [id, width] of Object.entries(input.widths ?? {})) {
    if (typeof width === "number" && Number.isFinite(width)) {
      widths[id] = Math.round(width);
    }
  }
  return { hidden, widths };
}

export async function getTablePreferences(
  userId: string,
): Promise<TablePreferences> {
  const db = await getDb();
  const row = await db.query.appMeta.findFirst({
    where: eq(appMeta.key, tablePreferencesKey(userId)),
  });
  if (!row) return {};
  try {
    const parsed = JSON.parse(row.value) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).map(([tableId, value]) => [
        tableId,
        sanitizePreference(value),
      ]),
    );
  } catch {
    return {};
  }
}

export async function saveTablePreference(
  userId: string,
  tableId: string,
  preference: TablePreference,
) {
  const current = await getTablePreferences(userId);
  current[tableId] = sanitizePreference(preference);
  const db = await getDb();
  const values = {
    key: tablePreferencesKey(userId),
    value: JSON.stringify(current),
    updatedAt: new Date().toISOString(),
  };
  await db
    .insert(appMeta)
    .values(values)
    .onConflictDoUpdate({ target: appMeta.key, set: values });
}
