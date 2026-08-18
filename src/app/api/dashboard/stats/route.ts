import { getSessionUser } from "@/lib/auth";
import { computeOverview } from "@/lib/analytics";
import {
  listOrdersByUser,
  listProductsByUser,
} from "@/lib/db";
import { getPayPalCredentials, getStripeCredentials } from "@/lib/payment-credentials";
import { jsonError } from "@/lib/utils";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);

  const url = new URL(req.url);
  const range = url.searchParams.get("range");
  const periodDays = range === "7" ? 7 : range === "90" ? 90 : 30;

  const [orders, products, paypal, stripe] = await Promise.all([
    listOrdersByUser(user.id, user.activeStoreId, user.environment),
    listProductsByUser(user.id, user.activeStoreId, user.environment),
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
      currency: overview.currency,
      periodDays: overview.periodDays,
      deltas: overview.deltas,
    },
    series: overview.series,
    recentOrders: orders.slice(0, 8),
  });
}
