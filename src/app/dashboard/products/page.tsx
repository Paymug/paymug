import { cookies } from "next/headers";
import { dashboardPageClass } from "@/components/dashboard/dashboard.styles";
import { getSessionUser } from "@/lib/auth";
import { listOrdersByUser, listProductsByUser } from "@/lib/db";
import { getStoreById } from "@/lib/stores";
import { getUtcQueryRange, shiftToWallClock } from "@/lib/timezone";
import { listVisitorEvents } from "@/lib/visitor-analytics";
import {
  dashboardFilterCookieName,
  parseDashboardFilterCookie,
  parseDashboardFilterState,
} from "../dashboard-filter.utils";
import type { DashboardOverviewSearchParams } from "../dashboard-overview.types";
import { ProductsWorkspace } from "./ProductsWorkspace";
import { buildProductPerformance } from "./products-page.utils";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<DashboardOverviewSearchParams>;
}) {
  const user = await getSessionUser();
  if (!user) return null;
  const store = await getStoreById(user.activeStoreId, user.id);
  if (!store) return null;

  const cookieJar = await cookies();
  const filter = parseDashboardFilterState(
    await searchParams,
    parseDashboardFilterCookie(
      cookieJar.get(dashboardFilterCookieName)?.value,
      user.timezone,
    ),
    user.timezone,
  );

  const queryRange = getUtcQueryRange(filter.startDate, filter.endDate);
  const [products, rawOrders, rawEvents] = await Promise.all([
    listProductsByUser(user.id, store.id, user.environment),
    listOrdersByUser(user.id, store.id, user.environment),
    listVisitorEvents(store.id, queryRange.startDate, queryRange.endDate),
  ]);
  // Count orders and visits by the user's local day.
  const orders = shiftToWallClock(rawOrders, user.timezone);
  const events = shiftToWallClock(rawEvents, user.timezone).filter((event) => {
    const day = event.createdAt.slice(0, 10);
    return day >= filter.startDate && day <= filter.endDate;
  });
  const performance = buildProductPerformance({
    orders,
    events,
    products,
    startDate: filter.startDate,
    endDate: filter.endDate,
  });

  return (
    <div className={dashboardPageClass}>
      <ProductsWorkspace
        products={products}
        environment={user.environment}
        performance={performance}
        currency={store.currency}
      />
    </div>
  );
}
