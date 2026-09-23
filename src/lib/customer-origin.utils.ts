import type { CustomerOrigin, OriginVisit } from "./customer-origin.types";

function knownLocation(value: string): string | undefined {
  return value && value !== "Unknown" ? value : undefined;
}

export function getFirstCustomerOrigin(visits: OriginVisit[]): CustomerOrigin | undefined {
  const first = visits[0];
  if (!first) return undefined;
  return {
    source: first.source,
    city: knownLocation(first.city),
    country: knownLocation(first.country),
  };
}

export function getOrderCustomerOrigin(
  visits: OriginVisit[],
  createdAt: string,
): CustomerOrigin | undefined {
  let last: OriginVisit | undefined;
  let referringVisit: OriginVisit | undefined;
  const attributionWindow = new Date(createdAt).getTime() - 30 * 24 * 60 * 60 * 1000;
  for (const visit of visits) {
    if (visit.createdAt > createdAt) break;
    last = visit;
    if (
      visit.source !== "Direct" &&
      new Date(visit.createdAt).getTime() >= attributionWindow
    ) {
      referringVisit = visit;
    }
  }
  if (!last) return undefined;
  return {
    source: referringVisit?.source ?? last.source,
    city: knownLocation(last.city),
    country: knownLocation(last.country),
  };
}
