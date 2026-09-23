import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { analyticsVisitorIdentities } from "@/db/schema";
import { uid } from "./utils";

export interface VisitorIdentity {
  storeId: string;
  visitorId: string;
  email: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function linkVisitorIdentity(input: {
  storeId: string;
  visitorId: string;
  email: string;
}): Promise<void> {
  const db = await getDb();
  const email = normalizeEmail(input.email);
  if (!email) return;
  const now = new Date().toISOString();
  await db
    .insert(analyticsVisitorIdentities)
    .values({
      id: uid(),
      storeId: input.storeId,
      visitorId: input.visitorId,
      email,
      linkedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        analyticsVisitorIdentities.storeId,
        analyticsVisitorIdentities.visitorId,
      ],
      set: { email, linkedAt: now },
    });
}

export async function listVisitorIdentities(
  storeId: string,
): Promise<VisitorIdentity[]> {
  const db = await getDb();
  const rows = await db.query.analyticsVisitorIdentities.findMany({
    where: eq(analyticsVisitorIdentities.storeId, storeId),
  });
  return rows.map((row) => ({
    storeId: row.storeId,
    visitorId: row.visitorId,
    email: row.email,
  }));
}
