import { ProductForm } from "@/components/ProductForm";
import { dashboardPageClass } from "@/components/dashboard/dashboard.styles";
import { getSessionUser } from "@/lib/auth";
import { getActiveStoreForUser } from "@/lib/stores";
import { listProductCategories } from "@/lib/product-categories";

export default async function NewProductPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const store = await getActiveStoreForUser(user.id, user.activeStoreId);
  if (!store) return null;
  const categories = await listProductCategories(user.id, store.id);

  return (
    <div className={`${dashboardPageClass} !max-w-6xl`}>
      <h1 className="sr-only">New product</h1>
      <ProductForm
        storeCurrency={store.currency}
        storeTransactionFeeType={store.transactionFeeType}
        storeTransactionFeeValue={store.transactionFeeValue}
        categories={categories}
      />
    </div>
  );
}
