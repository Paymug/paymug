import { getSessionUser } from "@/lib/auth";
import { computeOverview } from "@/lib/analytics";
import {
  listOrderMetricsByUser,
  listProductSummariesByUser,
  listRecentOrdersByUser,
} from "@/lib/db";
import { getPayPalCredentials, getStripeCredentials } from "@/lib/payment-credentials";
import { jsonError } from "@/lib/utils";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);

  const url = new URL(req.url);
  const range = url.searchParams.get("range");
  const periodDays = range === "7" ? 7 : range === "90" ? 90 : 30;

  // computeOverview only looks at the current + previous window; pad by two
  // days so server-local day keys never miss a boundary order.
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - periodDays * 2 - 2);
  const to = new Date();
  to.setUTCDate(to.getUTCDate() + 1);
  const [orders, recentOrders, products, paypal, stripe] = await Promise.all([
    listOrderMetricsByUser(user.id, user.activeStoreId, user.environment, {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    }),
    listRecentOrdersByUser(user.id, user.activeStoreId, user.environment, 8),
    listProductSummariesByUser(user.id, user.activeStoreId, user.environment),
    getPayPalCredentials(user.id, undefined, user.activeStoreId),
    getStripeCredentials(user.id, undefined, user.activeStoreId),
  ]);

  const overview = computeOverview(orders, periodDays);

  return Response.json({
    stats: {
      allRevenue: overview.allRevenue,
      newOrders: overview.newOrders,
      newOrderRevenue: overview.newOrderRevenue,
      avgOrderRevenue: overview.avgOrderRevenue,
      refunds: overview.refunds,
      refundCount: overview.refundCount,
      productsCount: products.length,
      publishedCount: products.filter((p) => p.status === "published").length,
      paypalConnected: Boolean(paypal),
      stripeConnected: Boolean(stripe),
      currency: orders.length
        ? overview.currency
        : recentOrders[0]?.currency || overview.currency,
      periodDays: overview.periodDays,
      deltas: overview.deltas,
    },
    series: overview.series,
    recentOrders,
  });
}
