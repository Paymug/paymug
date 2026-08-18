import { dashboardPageClass } from "@/components/dashboard/dashboard.styles";
import { getSessionUser } from "@/lib/auth";
import { listProductsByUser } from "@/lib/db";
import { ProductsWorkspace } from "./ProductsWorkspace";

export default async function ProductsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const products = await listProductsByUser(
    user.id,
    user.activeStoreId,
    user.environment
  );

  return (
    <div className={dashboardPageClass}>
      <ProductsWorkspace products={products} environment={user.environment} />
    </div>
  );
}
