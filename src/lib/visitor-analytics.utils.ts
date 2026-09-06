import { pctChange } from "./analytics.utils";
import type {
  AnalyticsBreakdownItem,
  AnalyticsDimension,
  AnalyticsDimensionFilters,
  AnalyticsProduct,
  BuildAnalyticsCommerceSeriesInput,
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
  dimension: AnalyticsDimension,
  filters: AnalyticsDimensionFilters,
  products: AnalyticsProduct[],
): AnalyticsBreakdownItem[] {
  const filteredEvents = filterVisitorEvents(
    events,
    filters,
    products,
    dimension,
  );
  const counts = new Map<string, number>();
  for (const event of filteredEvents) {
    const value = getAnalyticsDimensionValue(event, dimension, products);
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  for (const selectedValue of filters[dimension]) {
    if (!counts.has(selectedValue)) counts.set(selectedValue, 0);
  }
  const total = filteredEvents.length;
  return [...counts.entries()]
    .map(([value, visits]) => ({
      value,
      label: getAnalyticsDimensionLabel(value, dimension, products),
      visits,
      share: total ? (visits / total) * 100 : 0,
    }))
    .sort(
      (left, right) =>
        right.visits - left.visits || left.label.localeCompare(right.label),
    );
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

function getEventProductId(
  event: VisitorEvent,
  products: AnalyticsProduct[],
): string | undefined {
  const match = /^\/buy\/([^/]+)\/?$/.exec(event.path);
  if (!match) return undefined;
  let identifier = match[1];
  try {
    identifier = decodeURIComponent(identifier);
  } catch {
    // Keep the encoded identifier when a legacy path is malformed.
  }
  return products.find(
    (product) => product.id === identifier || product.slug === identifier,
  )?.id;
}

function getAnalyticsDimensionValue(
  event: VisitorEvent,
  dimension: AnalyticsDimension,
  products: AnalyticsProduct[],
): string {
  if (dimension === "pages") {
    const productId = getEventProductId(event, products);
    return productId ? `product:${productId}` : event.path;
  }
  if (dimension === "operatingSystems") return event.os;
  if (dimension === "sources") return event.source;
  if (dimension === "devices") return event.device;
  if (dimension === "cities") return event.city;
  return event.country;
}

function getAnalyticsDimensionLabel(
  value: string,
  dimension: AnalyticsDimension,
  products: AnalyticsProduct[],
): string {
  if (dimension === "pages" && value.startsWith("product:")) {
    return (
      products.find((product) => product.id === value.slice(8))?.name || value
    );
  }
  if (dimension === "countries") return formatCountry(value || "Unknown");
  return value || "Unknown";
}

function filterVisitorEvents(
  events: VisitorEvent[],
  filters: AnalyticsDimensionFilters,
  products: AnalyticsProduct[],
  excludedDimension?: AnalyticsDimension,
): VisitorEvent[] {
  return events.filter((event) =>
    (Object.keys(filters) as AnalyticsDimension[]).every((dimension) => {
      if (dimension === excludedDimension || filters[dimension].length === 0) {
        return true;
      }
      return filters[dimension].includes(
        getAnalyticsDimensionValue(event, dimension, products),
      );
    }),
  );
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
  products,
  productId,
  filters,
}: BuildVisitorAnalyticsInput): VisitorAnalyticsSummary {
  const previousRange = getPreviousAnalyticsRange(startDate, endDate);
  const productEvents = events.filter(
    (event) =>
      productId === "all" || getEventProductId(event, products) === productId,
  );
  const currentEventsForPeriod = productEvents.filter(
    (event) =>
      event.createdAt.slice(0, 10) >= startDate &&
      event.createdAt.slice(0, 10) <= endDate,
  );
  const previousEventsForPeriod = productEvents.filter(
    (event) =>
      event.createdAt.slice(0, 10) >= previousRange.startDate &&
      event.createdAt.slice(0, 10) <= previousRange.endDate,
  );
  const currentEvents = filterVisitorEvents(
    currentEventsForPeriod,
    filters,
    products,
  );
  const previousEvents = filterVisitorEvents(
    previousEventsForPeriod,
    filters,
    products,
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
    sources: createBreakdown(
      currentEventsForPeriod,
      "sources",
      filters,
      products,
    ),
    pages: createBreakdown(currentEventsForPeriod, "pages", filters, products),
    devices: createBreakdown(
      currentEventsForPeriod,
      "devices",
      filters,
      products,
    ),
    operatingSystems: createBreakdown(
      currentEventsForPeriod,
      "operatingSystems",
      filters,
      products,
    ),
    cities: createBreakdown(
      currentEventsForPeriod,
      "cities",
      filters,
      products,
    ),
    countries: createBreakdown(
      currentEventsForPeriod,
      "countries",
      filters,
      products,
    ),
  };
}

export function buildAnalyticsCommerceSeries({
  orders,
  startDate,
  endDate,
  interval,
  productId,
  metric,
}: BuildAnalyticsCommerceSeriesInput) {
  const points = createSeries([], startDate, endDate, interval);
  const values = new Map(points.map((point) => [point.date || point.label, 0]));
  for (const order of orders) {
    if (order.status !== "paid") continue;
    if (productId !== "all" && order.productId !== productId) continue;
    const date = order.paidAt || order.createdAt;
    const day = date.slice(0, 10);
    if (day < startDate || day > endDate) continue;
    const key = bucketKey(date, interval);
    values.set(
      key,
      (values.get(key) || 0) + (metric === "orders" ? 1 : order.amount),
    );
  }
  return points.map((point) => ({
    ...point,
    value: values.get(point.date || point.label) || 0,
  }));
}
