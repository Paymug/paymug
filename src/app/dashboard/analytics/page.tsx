import Link from "next/link";
import { cookies } from "next/headers";
import {
  dashboardButtonBaseClass,
  dashboardPageClass,
} from "@/components/dashboard/dashboard.styles";
import { getSessionUser } from "@/lib/auth";
import { listOrdersByUser, listProductsByUser } from "@/lib/db";
import { getStoreById } from "@/lib/stores";
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
    parseDashboardFilterCookie(cookieJar.get(dashboardFilterCookieName)?.value),
  );
  const previousRange = getPreviousAnalyticsRange(
    filter.startDate,
    filter.endDate,
  );
  const [events, earliestDate, products, orders] = await Promise.all([
    listVisitorEvents(store.id, previousRange.startDate, filter.endDate),
    getEarliestVisitorEventDate(store.id),
    listProductsByUser(user.id, store.id, user.environment),
    listOrdersByUser(user.id, store.id, user.environment),
  ]);
  const selectedProductId =
    filter.productId === "all" ||
    products.some((product) => product.id === filter.productId)
      ? filter.productId
      : "all";

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
        commerceMetric={store.analyticsCommerceMetric ?? null}
      />
    </div>
  );
}
