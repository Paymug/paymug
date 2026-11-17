import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { featureRecords } from "@/db/schema";
import {
  type CompatInstance,
  type CompatLicense,
  type CompatResult,
} from "@/lib/lemonsqueezy/license-compat";

function parseData(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** LS SDKs send form-encoded or JSON bodies; accept both. */
export async function readBody(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get("content-type") || "";
  const out: Record<string, string> = {};
  if (type.includes("application/json")) {
    const json = await request.json().catch(() => ({}));
    for (const [k, v] of Object.entries(json ?? {})) if (typeof v === "string") out[k] = v;
  } else {
    const text = await request.text().catch(() => "");
    for (const [k, v] of new URLSearchParams(text)) out[k] = v;
  }
  return out;
}

export async function findCompatLicense(key: string | undefined): Promise<CompatLicense | undefined> {
  if (!key?.trim()) return undefined;
  const db = await getDb();
  const row = await db.query.featureRecords.findFirst({
    where: sql`${featureRecords.feature} = 'licenses' AND lower(${featureRecords.title}) = ${key.trim().toLowerCase()}`,
  });
  return row
    ? {
        id: row.id,
        key: row.title,
        status: row.status,
        environment: row.environment,
        createdAt: row.createdAt,
        data: parseData(row.data),
      }
    : undefined;
}

export async function saveInstances(license: CompatLicense, instances: CompatInstance[]) {
  const db = await getDb();
  await db
    .update(featureRecords)
    .set({
      data: JSON.stringify({ ...license.data, lemonSqueezyInstances: instances }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(featureRecords.id, license.id));
}

export async function respond(license: CompatLicense | undefined, result: CompatResult) {
  if (license && result.nextInstances) await saveInstances(license, result.nextInstances);
  return Response.json(result.body, { status: result.status });
}

