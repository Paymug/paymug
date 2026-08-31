import { pctChange } from "./analytics.utils";
import type {
  AnalyticsBreakdownItem,
  BuildVisitorAnalyticsInput,
  VisitorAnalyticsSummary,
  VisitorEvent,
} from "./visitor-analytics.types";

const dayMs = 86_400_000;

function parseDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00Z`);
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}

function addHours(value: string, hours: number): string {
  const date = new Date(value);
  date.setUTCHours(date.getUTCHours() + hours);
  return date.toISOString();
}

function formatLabel(
  start: string,
  interval: BuildVisitorAnalyticsInput["interval"],
): string {
  const date = interval === "hourly" ? new Date(start) : parseDate(start);
  if (interval === "hourly") {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      timeZone: "UTC",
    }).format(date);
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    ...(interval === "monthly" ? {} : { day: "numeric" }),
    timeZone: "UTC",
  }).format(date);
}

function bucketKey(
  dateValue: string,
  interval: BuildVisitorAnalyticsInput["interval"],
): string {
  if (interval === "hourly") {
    const date = dateValue.includes("T")
      ? new Date(dateValue)
      : new Date(`${dateValue.slice(0, 10)}T00:00:00.000Z`);
    date.setUTCMinutes(0, 0, 0);
    return date.toISOString();
  }
  const date = parseDate(dateValue);
  if (interval === "monthly") {
    return dateKey(
      new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)),
    );
  }
  if (interval === "weekly") {
    const weekday = date.getUTCDay();
    date.setUTCDate(date.getUTCDate() - ((weekday + 6) % 7));
  }
  return dateKey(date);
}

function createSeries(
  events: VisitorEvent[],
  startDate: string,
  endDate: string,
  interval: BuildVisitorAnalyticsInput["interval"],
  uniqueVisitors = false,
) {
  const counts = new Map<string, number>();
  const visitorIds = new Map<string, Set<string>>();
  for (const event of events) {
    const key = bucketKey(event.createdAt, interval);
    if (uniqueVisitors) {
      const bucketVisitors = visitorIds.get(key) || new Set<string>();
      bucketVisitors.add(event.visitorId);
      visitorIds.set(key, bucketVisitors);
    } else {
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  const points = [];
  let cursor = bucketKey(startDate, interval);
  const finalBucket =
    interval === "hourly"
      ? `${endDate.slice(0, 10)}T23:00:00.000Z`
      : bucketKey(endDate, interval);
  while (cursor <= finalBucket) {
    points.push({
      date: cursor,
      label: formatLabel(cursor, interval),
      value: uniqueVisitors
        ? visitorIds.get(cursor)?.size || 0
        : counts.get(cursor) || 0,
    });
    if (interval === "hourly") {
      cursor = addHours(cursor, 1);
    } else if (interval === "monthly") {
      const date = parseDate(cursor);
      date.setUTCMonth(date.getUTCMonth() + 1);
      cursor = dateKey(date);
    } else {
      cursor = addDays(cursor, interval === "weekly" ? 7 : 1);
    }
  }
  return points;
}

function createBreakdown(
  events: VisitorEvent[],
  readLabel: (event: VisitorEvent) => string,
): AnalyticsBreakdownItem[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    const label = readLabel(event) || "Unknown";
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  const total = events.length;
  return [...counts.entries()]
    .map(([label, visits]) => ({
      label,
      visits,
      share: total ? (visits / total) * 100 : 0,
    }))
    .sort(
      (left, right) =>
        right.visits - left.visits || left.label.localeCompare(right.label),
    )
    .slice(0, 8);
}

function uniqueVisitorCount(events: VisitorEvent[]): number {
  return new Set(events.map((event) => event.visitorId)).size;
}

function formatCountry(country: string): string {
  if (!/^[A-Z]{2}$/i.test(country)) return country;
  return new Intl.DisplayNames(["en"], { type: "region" }).of(
    country.toUpperCase(),
  ) || country;
}

export function getPreviousAnalyticsRange(startDate: string, endDate: string) {
  const days =
    Math.round(
      (parseDate(endDate).getTime() - parseDate(startDate).getTime()) / dayMs,
    ) + 1;
  return {
    startDate: addDays(startDate, -days),
    endDate: addDays(startDate, -1),
  };
}

export function buildVisitorAnalytics({
  events,
  startDate,
  endDate,
  interval,
}: BuildVisitorAnalyticsInput): VisitorAnalyticsSummary {
  const previousRange = getPreviousAnalyticsRange(startDate, endDate);
  const currentEvents = events.filter(
    (event) =>
      event.createdAt.slice(0, 10) >= startDate &&
      event.createdAt.slice(0, 10) <= endDate,
  );
  const previousEvents = events.filter(
    (event) =>
      event.createdAt.slice(0, 10) >= previousRange.startDate &&
      event.createdAt.slice(0, 10) <= previousRange.endDate,
  );
  const uniqueVisitors = uniqueVisitorCount(currentEvents);
  const previousUniqueVisitors = uniqueVisitorCount(previousEvents);

  return {
    visits: currentEvents.length,
    uniqueVisitors,
    previousVisits: previousEvents.length,
    previousUniqueVisitors,
    visitsDelta: pctChange(currentEvents.length, previousEvents.length),
    uniqueVisitorsDelta: pctChange(uniqueVisitors, previousUniqueVisitors),
    series: createSeries(currentEvents, startDate, endDate, interval),
    previousSeries: createSeries(
      previousEvents,
      previousRange.startDate,
      previousRange.endDate,
      interval,
    ),
    uniqueVisitorSeries: createSeries(
      currentEvents,
      startDate,
      endDate,
      interval,
      true,
    ),
    previousUniqueVisitorSeries: createSeries(
      previousEvents,
      previousRange.startDate,
      previousRange.endDate,
      interval,
      true,
    ),
    sources: createBreakdown(currentEvents, (event) => event.source),
    pages: createBreakdown(currentEvents, (event) => event.path),
    devices: createBreakdown(currentEvents, (event) => event.device),
    operatingSystems: createBreakdown(currentEvents, (event) => event.os),
    cities: createBreakdown(currentEvents, (event) => event.city),
    countries: createBreakdown(currentEvents, (event) =>
      formatCountry(event.country),
    ),
  };
}
