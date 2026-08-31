import { dashboardPageClass } from "@/components/dashboard/dashboard.styles";
import { getSessionUser } from "@/lib/auth";
import { listProductCategories } from "@/lib/product-categories";
import { listProductsByUser } from "@/lib/db";
import { CategoriesWorkspace } from "./CategoriesWorkspace";

export default async function CategoriesPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const [categories, products] = await Promise.all([
    listProductCategories(user.id, user.activeStoreId),
    listProductsByUser(user.id, user.activeStoreId, user.environment),
  ]);
  return (
    <div className={dashboardPageClass}>
      <CategoriesWorkspace categories={categories} products={products} />
    </div>
  );
}
