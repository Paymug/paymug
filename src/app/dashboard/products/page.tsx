import { cookies } from "next/headers";
import { dashboardPageClass } from "@/components/dashboard/dashboard.styles";
import { getSessionUser } from "@/lib/auth";
import { listOrdersByUser, listProductsByUser } from "@/lib/db";
import { getStoreById } from "@/lib/stores";
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
    parseDashboardFilterCookie(cookieJar.get(dashboardFilterCookieName)?.value),
  );

  const [products, orders, events] = await Promise.all([
    listProductsByUser(user.id, store.id, user.environment),
    listOrdersByUser(user.id, store.id, user.environment),
    listVisitorEvents(store.id, filter.startDate, filter.endDate),
  ]);
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
