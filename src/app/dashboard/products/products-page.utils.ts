import type { Order } from "@/lib/types";
import type { ProductPerformanceSummary } from "./ProductsWorkspace.types";

export function buildProductPerformance(
  orders: Order[]
): ProductPerformanceSummary {
  const byProduct: ProductPerformanceSummary["byProduct"] = {};
  const totals = { sales: 0, revenue: 0 };

  for (const order of orders) {
    if (order.status !== "paid") continue;
    const performance = byProduct[order.productId] ?? { sales: 0, revenue: 0 };
    performance.sales += 1;
    performance.revenue += order.amount;
    byProduct[order.productId] = performance;
    totals.sales += 1;
    totals.revenue += order.amount;
  }

  return { byProduct, totals };
}
