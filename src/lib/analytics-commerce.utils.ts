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

export interface VariantRevenueRow {
  productId: string;
  variantId: string;
  variantName: string;
  orders: number;
  revenue: number;
  refunds: number;
}

/**
 * Paid orders and revenue per product variant. Refunded orders count toward
 * `refunds`, not revenue. Orders without a variant are skipped.
 */
export function summarizeRevenueByVariant(
  orders: Array<{
    productId: string;
    variantId?: string | null;
    variantName?: string | null;
    status: string;
    amount: number;
  }>,
): VariantRevenueRow[] {
  const rows = new Map<string, VariantRevenueRow>();
  for (const order of orders) {
    if (!order.variantId) continue;
    const key = `${order.productId}|${order.variantId}`;
    const row =
      rows.get(key) ??
      {
        productId: order.productId,
        variantId: order.variantId,
        variantName: order.variantName || "Variant",
        orders: 0,
        revenue: 0,
        refunds: 0,
      };
    if (order.status === "paid") {
      row.orders += 1;
      row.revenue += order.amount;
    } else if (order.status === "refunded") {
      row.refunds += order.amount;
    }
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.revenue - a.revenue);
}
