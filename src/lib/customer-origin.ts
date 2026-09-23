import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { visitorEvents } from "@/db/schema";
import type { VisitorIdentity } from "./visitor-identities";
import type { OriginVisit } from "./customer-origin.types";

export async function listOriginVisitsByEmail(
  storeId: string,
  identities: VisitorIdentity[],
): Promise<Map<string, OriginVisit[]>> {
  const emailByVisitorId = new Map(
    identities.map((identity) => [identity.visitorId, identity.email.trim().toLowerCase()]),
  );
  const visitorIds = [...emailByVisitorId.keys()];
  const visitsByEmail = new Map<string, OriginVisit[]>();
  if (visitorIds.length === 0) return visitsByEmail;

  const db = await getDb();
  for (let offset = 0; offset < visitorIds.length; offset += 400) {
    const rows = await db
      .select({
        visitorId: visitorEvents.visitorId,
        source: visitorEvents.source,
        city: visitorEvents.city,
        country: visitorEvents.country,
        createdAt: visitorEvents.createdAt,
      })
      .from(visitorEvents)
      .where(
        and(
          eq(visitorEvents.storeId, storeId),
          inArray(visitorEvents.visitorId, visitorIds.slice(offset, offset + 400)),
        ),
      );
    for (const visit of rows) {
      const email = emailByVisitorId.get(visit.visitorId);
      if (!email) continue;
      const visits = visitsByEmail.get(email) ?? [];
      visits.push(visit);
      visitsByEmail.set(email, visits);
    }
  }
  for (const visits of visitsByEmail.values()) {
    visits.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }
  return visitsByEmail;
}
