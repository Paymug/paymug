import { StoreSettingsForm } from "@/components/dashboard/StoreSettingsForm";
import {
  dashboardPageClass,
  dashboardPageCopyClass,
} from "@/components/dashboard/dashboard.styles";
import { getSessionUser } from "@/lib/auth";
import { listProductsByUser } from "@/lib/db";
import { getCategoryProductOrder } from "@/lib/product-category-assignments";
import { listProductCategories } from "@/lib/product-categories";
import { getActiveStoreForUser } from "@/lib/stores";
import { StorefrontLayoutEditor } from "./StorefrontLayoutEditor";

export default async function StoreSettingsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const store = await getActiveStoreForUser(user.id, user.activeStoreId);
  if (!store) return null;

  const [categories, allProducts] = await Promise.all([
    listProductCategories(user.id, store.id),
    listProductsByUser(user.id, store.id, user.environment),
  ]);
  const products = allProducts.filter(
    (product) => product.status === "published" && !product.hideFromStorefront,
  );
  const categoryProductOrder = Object.fromEntries(
    await getCategoryProductOrder(categories.map((category) => category.id)),
  );

  return (
    <div className={`${dashboardPageClass} !max-w-5xl`}>
      <h1 className="sr-only">Store settings</h1>
      <p className={dashboardPageCopyClass}>
        Customize how your active store appears to customers.
      </p>
      <StoreSettingsForm
        storeId={store.id}
        initialName={store.name}
        initialSlug={store.slug}
        initialDomain={store.domain}
        initialIsPrimary={store.id === user.primaryStoreId}
        initialDescription={store.description}
        initialLogoImageUrl={store.logoImageUrl}
        initialCoverImageUrl={store.coverImageUrl}
        initialEmailFrom={store.emailFrom}
        initialEmailReplyTo={store.emailReplyTo}
        initialCurrency={store.currency}
        initialTransactionFeeType={store.transactionFeeType}
        initialTransactionFeeValue={store.transactionFeeValue}
        previewContent={
          <StorefrontLayoutEditor
            categories={categories}
            products={products}
            categoryProductOrder={categoryProductOrder}
            displayPurchases={store.displayPurchasesEnabled}
          />
        }
      />
    </div>
  );
}
