export type AnalyticsCommerceMetric = "orders" | "revenue";

const commerceMetrics: AnalyticsCommerceMetric[] = ["orders", "revenue"];

export function parseAnalyticsCommerceMetrics(
  value: string | null | undefined,
): AnalyticsCommerceMetric[] {
  if (!value) return [];
  const selected = new Set(value.split(",").map((entry) => entry.trim()));
  return commerceMetrics.filter((metric) => selected.has(metric));
}

export function serializeAnalyticsCommerceMetrics(
  values: AnalyticsCommerceMetric[],
): string | null {
  const selected = commerceMetrics.filter((metric) => values.includes(metric));
  return selected.length ? selected.join(",") : null;
}
