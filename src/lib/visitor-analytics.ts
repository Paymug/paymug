import "server-only";

import { and, asc, eq, gte, lte } from "drizzle-orm";
import { visitorEvents } from "@/db/schema";
import { getDb } from "@/db";
import { uid } from "./utils";
import type {
  RecordVisitorEventInput,
  VisitorEvent,
} from "./visitor-analytics.types";

export async function recordVisitorEvent(input: RecordVisitorEventInput): Promise<void> {
  const db = await getDb();
  await db.insert(visitorEvents).values({
    id: uid(),
    ...input,
    createdAt: new Date().toISOString(),
  });
}

export async function listVisitorEvents(
  storeId: string,
  startDate: string,
  endDate: string,
): Promise<VisitorEvent[]> {
  const db = await getDb();
  return db.query.visitorEvents.findMany({
    where: and(
      eq(visitorEvents.storeId, storeId),
      gte(visitorEvents.createdAt, `${startDate}T00:00:00.000Z`),
      lte(visitorEvents.createdAt, `${endDate}T23:59:59.999Z`),
    ),
    orderBy: [asc(visitorEvents.createdAt)],
  });
}

export async function getEarliestVisitorEventDate(storeId: string): Promise<string | undefined> {
  const db = await getDb();
  const event = await db.query.visitorEvents.findFirst({
    columns: { createdAt: true },
    where: eq(visitorEvents.storeId, storeId),
    orderBy: [asc(visitorEvents.createdAt)],
  });
  return event?.createdAt.slice(0, 10);
}
