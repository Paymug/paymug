import Link from "next/link";
import { AppIcon } from "./dashboard/Icon";
import { StoreSubscribeForm } from "./StoreSubscribeForm";
import { StorefrontFooter } from "./StorefrontFooter";
import { StorefrontNavigation } from "./StorefrontNavigation";
import { StorefrontProductGrid } from "./StorefrontProductGrid";
import { StoreTestModeRibbon } from "./StoreTestModeRibbon";
import { VisitorAnalyticsTracker } from "./VisitorAnalyticsTracker";
import { hasProFeature } from "@/lib/app-license";
import { getSessionUser } from "@/lib/auth";
import { findUserById, listProductsByUser } from "@/lib/db";
import { listStorePages } from "@/lib/store-pages";
import { resolveStorefrontEnvironment } from "@/lib/storefront-environment.utils";
import { getPrimaryStore } from "@/lib/stores";
import { getStorefrontBasePath } from "@/lib/storefront-paths";
import type { StoreCategoryPageProps } from "./StoreCategoryPage.types";

export async function StoreCategoryPage({
  store,
  category,
}: StoreCategoryPageProps) {
  const [seller, viewer, primaryStore, pagesUnlocked, affiliatesUnlocked] =
    await Promise.all([
      findUserById(store.userId),
      getSessionUser(),
      getPrimaryStore(),
      hasProFeature("pages"),
      hasProFeature("affiliates"),
    ]);
  if (!seller) return null;
  const environment = resolveStorefrontEnvironment(
    store.userId,
    seller.environment,
    viewer?.id,
  );
  const [allProducts, storePages] = await Promise.all([
    listProductsByUser(store.userId, store.id, environment),
    listStorePages(store.userId, store.id, environment),
  ]);
  const products = allProducts.filter(
    (product) =>
      product.status === "published" &&
      product.categoryIds.includes(category.id),
  );
  const publishedPages = pagesUnlocked
    ? storePages.filter((page) => page.status === "published")
    : [];
  const topPages = publishedPages.filter((page) => page.navigation === "top");
  const footerPages = publishedPages.filter(
    (page) => page.navigation === "footer",
  );
  const basePath = getStorefrontBasePath(store, primaryStore);
  const isTestMode = environment === "sandbox";

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <VisitorAnalyticsTracker
        storeId={store.id}
        enabled={store.analyticsEnabled && !isTestMode}
      />
      {isTestMode && <StoreTestModeRibbon />}
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 pb-12">
        <StorefrontNavigation
          pages={topPages}
          basePath={basePath}
          affiliatesEnabled={affiliatesUnlocked && store.affiliatesEnabled}
          showDashboard={viewer?.id === seller.id}
          className="mb-4 border border-border/60 rounded-full sticky top-4 bg-white/80 z-10 justify-center w-fit mx-auto px-4 backdrop-blur-xl"
        />
        <header className="my-12 text-center">
          <Link href={basePath || "/"} className="inline-flex items-center gap-2">
            {store.logoImageUrl ? (
              <img
                src={store.logoImageUrl}
                alt={`${store.name} logo`}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <AppIcon size={30} />
            )}
            <span className="text-sm font-semibold text-muted">{store.name}</span>
          </Link>
          <h1 className="mt-5 text-4xl font-bold tracking-tight">
            {category.name}
          </h1>
          {category.description && (
            <p className="mx-auto mt-3 max-w-2xl whitespace-pre-line text-muted">
              {category.description}
            </p>
          )}
        </header>

        {products.length ? (
          <StorefrontProductGrid
            products={products}
            isTestMode={isTestMode}
            displayPurchases={store.displayPurchasesEnabled}
          />
        ) : (
          <p className="py-16 text-center text-sm text-muted">
            No products published in this category yet.
          </p>
        )}
      </main>
      <StoreSubscribeForm storeSlug={store.slug} />
      <StorefrontFooter pages={footerPages} basePath={basePath} />
    </div>
  );
}
