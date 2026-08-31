import { dashboardPageClass } from "@/components/dashboard/dashboard.styles";
import { getSessionUser } from "@/lib/auth";
import { listProductCategories } from "@/lib/product-categories";
import { CategoriesWorkspace } from "./CategoriesWorkspace";

export default async function CategoriesPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const categories = await listProductCategories(
    user.id,
    user.activeStoreId,
  );
  return (
    <div className={dashboardPageClass}>
      <CategoriesWorkspace categories={categories} />
    </div>
  );
}
