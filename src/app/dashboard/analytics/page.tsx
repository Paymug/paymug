import Link from "next/link";
import { cookies } from "next/headers";
import {
  dashboardButtonBaseClass,
  dashboardPageClass,
} from "@/components/dashboard/dashboard.styles";
import {
  parseAnalyticsCommerceMetrics,
  summarizeRevenueByVariant,
} from "@/lib/analytics-commerce.utils";
import { formatMoney } from "@/lib/format";
import { getSessionUser } from "@/lib/auth";
import { listOrderMetricsByUser, listProductSummariesByUser } from "@/lib/db";
import { getStoreById } from "@/lib/stores";
import {
  getUtcQueryRange,
  shiftToWallClock,
  toWallClockIso,
} from "@/lib/timezone";
import {
  getEarliestVisitorEventDate,
  listVisitorEvents,
} from "@/lib/visitor-analytics";
import { getPreviousAnalyticsRange } from "@/lib/visitor-analytics.utils";
import {
  dashboardFilterCookieName,
  parseDashboardFilterCookie,
  parseDashboardFilterState,
} from "../dashboard-filter.utils";
import { AnalyticsOverview } from "./AnalyticsOverview";
import type { AnalyticsPageProps } from "./analytics.types";

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const user = await getSessionUser();
  if (!user) return null;
  const store = await getStoreById(user.activeStoreId, user.id);
  if (!store) return null;

  if (!store.analyticsEnabled) {
    return (
      <div className={`${dashboardPageClass} py-16 text-center`}>
        <h1 className="text-2xl font-semibold">Visitor analytics is off</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted">
          Enable analytics in settings to start collecting anonymous storefront
          visit data.
        </p>
        <Link
          href="/dashboard/settings"
          className={`${dashboardButtonBaseClass} mt-6 bg-accent text-[#342900] hover:bg-accent-hover`}
        >
          Open settings
        </Link>
      </div>
    );
  }

  const cookieJar = await cookies();
  const filter = parseDashboardFilterState(
    await searchParams,
    parseDashboardFilterCookie(
      cookieJar.get(dashboardFilterCookieName)?.value,
      user.timezone,
    ),
    user.timezone,
  );
  const previousRange = getPreviousAnalyticsRange(
    filter.startDate,
    filter.endDate,
  );
  const queryRange = getUtcQueryRange(previousRange.startDate, filter.endDate);
  // Orders are only shown for the current range; pad a day for tz shifts.
  const orderRange = getUtcQueryRange(filter.startDate, filter.endDate);
  const [rawEvents, rawEarliestDate, products, rawOrders] = await Promise.all([
    listVisitorEvents(store.id, queryRange.startDate, queryRange.endDate),
    getEarliestVisitorEventDate(store.id),
    listProductSummariesByUser(user.id, store.id, user.environment),
    listOrderMetricsByUser(user.id, store.id, user.environment, {
      from: orderRange.startDate,
      to: orderRange.endDate,
    }),
  ]);
  const events = shiftToWallClock(rawEvents, user.timezone);
  const orders = shiftToWallClock(rawOrders, user.timezone);
  const earliestDate = rawEarliestDate
    ? toWallClockIso(rawEarliestDate, user.timezone).slice(0, 10)
    : undefined;
  const selectedProductId =
    filter.productId === "all" ||
    products.some((product) => product.id === filter.productId)
      ? filter.productId
      : "all";

  const periodOrders = orders.filter((order) => {
    const date = (order.paidAt || order.createdAt).slice(0, 10);
    return date >= filter.startDate && date <= filter.endDate;
  });
  const productNames = new Map(products.map((product) => [product.id, product.name]));
  const variantRevenue = summarizeRevenueByVariant(
    periodOrders.filter(
      (order) => selectedProductId === "all" || order.productId === selectedProductId,
    ),
  );

  return (
    <div className={dashboardPageClass}>
      <AnalyticsOverview
        startDate={filter.startDate}
        endDate={filter.endDate}
        interval={filter.interval}
        rangeMode={filter.rangeMode}
        productId={selectedProductId}
        products={products.map(({ id, name, slug }) => ({ id, name, slug }))}
        earliestDate={earliestDate}
        events={events}
        orders={orders
          .filter((order) => {
            const date = (order.paidAt || order.createdAt).slice(0, 10);
            return date >= filter.startDate && date <= filter.endDate;
          })
          .map(({ productId, status, amount, paidAt, createdAt }) => ({
            productId,
            status,
            amount,
            paidAt,
            createdAt,
          }))}
        currency={store.currency}
        commerceMetrics={parseAnalyticsCommerceMetrics(
          store.analyticsCommerceMetric,
        )}
      />
      {variantRevenue.length > 0 && (
        <section className="mt-10" aria-label="Revenue by variant">
          <h2 className="text-base font-semibold">Revenue by variant</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-[#e8e8ee] text-left text-[#85859d]">
                <th className="py-2 font-medium">Product</th>
                <th className="py-2 font-medium">Variant</th>
                <th className="py-2 text-right font-medium">Orders</th>
                <th className="py-2 text-right font-medium">Revenue</th>
                <th className="py-2 text-right font-medium">Refunds</th>
              </tr>
            </thead>
            <tbody>
              {variantRevenue.map((row) => (
                <tr key={`${row.productId}-${row.variantId}`} className="border-b border-[#f0f0f4]">
                  <td className="py-2">{productNames.get(row.productId) ?? "Product"}</td>
                  <td className="py-2">{row.variantName}</td>
                  <td className="py-2 text-right">{row.orders}</td>
                  <td className="py-2 text-right">{formatMoney(row.revenue, store.currency)}</td>
                  <td className="py-2 text-right">{formatMoney(row.refunds, store.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
