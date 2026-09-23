import { dashboardPageClass } from "@/components/dashboard/dashboard.styles";
import { getSessionUser } from "@/lib/auth";
import { listOrdersByUser, listProductsByUser } from "@/lib/db";
import { getStoreById } from "@/lib/stores";
import { ProductsWorkspace } from "./ProductsWorkspace";
import { buildProductPerformance } from "./products-page.utils";

export default async function ProductsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const [products, orders, store] = await Promise.all([
    listProductsByUser(user.id, user.activeStoreId, user.environment),
    listOrdersByUser(user.id, user.activeStoreId, user.environment),
    getStoreById(user.activeStoreId, user.id),
  ]);
  const performance = buildProductPerformance(orders);

  return (
    <div className={dashboardPageClass}>
      <ProductsWorkspace
        products={products}
        environment={user.environment}
        performance={performance}
        currency={store?.currency ?? "USD"}
      />
    </div>
  );
}
