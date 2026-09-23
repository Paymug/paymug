import type { Order, Product } from "@/lib/types";
import type { VisitorEvent } from "@/lib/visitor-analytics.types";
import type {
  ProductPerformance,
  ProductPerformanceSummary,
} from "./ProductsWorkspace.types";

function orderDay(order: Order): string {
  return (order.paidAt || order.createdAt).slice(0, 10);
}

export function buildProductPerformance(input: {
  orders: Order[];
  events: VisitorEvent[];
  products: Product[];
  startDate: string;
  endDate: string;
}): ProductPerformanceSummary {
  const byProduct: ProductPerformanceSummary["byProduct"] = {};
  const purchasesInRange: Record<string, number> = {};

  const getPerformance = (productId: string): ProductPerformance => {
    const existing = byProduct[productId];
    if (existing) return existing;
    const created: ProductPerformance = {
      sales: 0,
      revenue: 0,
      visits: 0,
      conversion: null,
    };
    byProduct[productId] = created;
    return created;
  };

  for (const order of input.orders) {
    if (order.status !== "paid") continue;
    const performance = getPerformance(order.productId);
    performance.sales += 1;
    performance.revenue += order.amount;
    const day = orderDay(order);
    if (day >= input.startDate && day <= input.endDate) {
      purchasesInRange[order.productId] =
        (purchasesInRange[order.productId] ?? 0) + 1;
    }
  }

  const pathToProductId = new Map<string, string>();
  for (const product of input.products) {
    for (const identifier of [product.id, product.slug]) {
      if (!identifier) continue;
      pathToProductId.set(`/buy/${identifier}`.toLowerCase(), product.id);
    }
  }
  for (const event of input.events) {
    const productId = pathToProductId.get(event.path.toLowerCase());
    if (!productId) continue;
    getPerformance(productId).visits += 1;
  }

  const totals: ProductPerformance = {
    sales: 0,
    revenue: 0,
    visits: 0,
    conversion: null,
  };
  let totalPurchases = 0;
  for (const product of input.products) {
    const performance = byProduct[product.id];
    if (!performance) continue;
    totals.sales += performance.sales;
    totals.revenue += performance.revenue;
    totals.visits += performance.visits;
    const purchases = purchasesInRange[product.id] ?? 0;
    totalPurchases += purchases;
    performance.conversion =
      performance.visits > 0 ? purchases / performance.visits : null;
  }
  totals.conversion = totals.visits > 0 ? totalPurchases / totals.visits : null;

  return { byProduct, totals };
}
