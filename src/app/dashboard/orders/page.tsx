import { getSessionUser } from "@/lib/auth";
import { listOrdersByUser } from "@/lib/db";
import { listOriginVisitsByEmail } from "@/lib/customer-origin";
import { listVisitorIdentities } from "@/lib/visitor-identities";
import {
  dashboardPageClass,
  dashboardPageCopyClass,
} from "@/components/dashboard/dashboard.styles";
import { OrdersWorkspace } from "./OrdersWorkspace";
import { buildDashboardOrderItems } from "./orders-page.utils";

export default async function OrdersPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const orders = await listOrdersByUser(
    user.id,
    user.activeStoreId,
    user.environment
  );
  const identities = user.environment === "live"
    ? await listVisitorIdentities(user.activeStoreId)
    : [];
  const originVisitsByEmail = await listOriginVisitsByEmail(user.activeStoreId, identities);
  const items = await buildDashboardOrderItems(user.id, orders, originVisitsByEmail);

  return (
    <div className={dashboardPageClass}>
      <h1 className="sr-only">Orders</h1>
      <p className={dashboardPageCopyClass}>
        Payments that went to your connected gateway.
      </p>
      <OrdersWorkspace orders={items} />
    </div>
  );
}
