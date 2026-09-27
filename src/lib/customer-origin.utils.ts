import type { CustomerOrigin, OriginVisit } from "./customer-origin.types";

function knownLocation(value: string): string | undefined {
  return value && value !== "Unknown" ? value : undefined;
}

export function getFirstCustomerOrigin(visits: OriginVisit[]): CustomerOrigin | undefined {
  const first = visits[0];
  if (!first) return undefined;
  return {
    source: first.source,
    city: knownLocation(first.city) ?? visits.find((visit) => knownLocation(visit.city))?.city,
    country: knownLocation(first.country) ?? visits.find((visit) => knownLocation(visit.country))?.country,
  };
}

export function getOrderCustomerOrigin(
  visits: OriginVisit[],
  createdAt: string,
): CustomerOrigin | undefined {
  let last: OriginVisit | undefined;
  let referringVisit: OriginVisit | undefined;
  let lastKnownCity: string | undefined;
  let lastKnownCountry: string | undefined;
  const attributionWindow = new Date(createdAt).getTime() - 30 * 24 * 60 * 60 * 1000;
  for (const visit of visits) {
    if (visit.createdAt > createdAt) break;
    last = visit;
    lastKnownCity = knownLocation(visit.city) ?? lastKnownCity;
    lastKnownCountry = knownLocation(visit.country) ?? lastKnownCountry;
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
    city: lastKnownCity,
    country: lastKnownCountry,
  };
}
