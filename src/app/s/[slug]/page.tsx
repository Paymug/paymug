import Link from "next/link";
import { notFound } from "next/navigation";
import { AppIcon } from "@/components/dashboard/Icon";
import { StoreSubscribeForm } from "@/components/StoreSubscribeForm";
import { StorefrontFooter } from "@/components/StorefrontFooter";
import { StorefrontNavigation } from "@/components/StorefrontNavigation";
import { StoreTestModeRibbon } from "@/components/StoreTestModeRibbon";
import { VisitorAnalyticsTracker } from "@/components/VisitorAnalyticsTracker";
import { StorefrontProductGrid } from "@/components/StorefrontProductGrid";
import { cardClass } from "@/components/ui.styles";
import { getSessionUser } from "@/lib/auth";
import { findUserByStoreSlug, listProductsByUser } from "@/lib/db";
import { getPrimaryStore, getStoreById } from "@/lib/stores";
import { getStorefrontBasePath } from "@/lib/storefront-paths";
import { listStorePages } from "@/lib/store-pages";
import { resolveStorefrontEnvironment } from "@/lib/storefront-environment.utils";
import { generateStorefrontMetadata } from "./page.utils";
import type { StorefrontPageProps } from "./page.types";
import clsx from "clsx";
import { hasProFeature } from "@/lib/app-license";
import { listProductCategories } from "@/lib/product-categories";

export const generateMetadata = generateStorefrontMetadata;

export default async function StorefrontPage({ params }: StorefrontPageProps) {
  const { slug } = await params;
  const seller = await findUserByStoreSlug(slug);
  if (!seller) notFound();
  const viewer = await getSessionUser();
  const environment = resolveStorefrontEnvironment(
    seller.id,
    seller.environment,
    viewer?.id,
  );
  const [
    store,
    primaryStore,
    allProducts,
    storePages,
    pagesUnlocked,
    affiliatesUnlocked,
    categories,
  ] = await Promise.all([
    getStoreById(seller.activeStoreId, seller.id),
    getPrimaryStore(),
    listProductsByUser(seller.id, seller.activeStoreId, environment),
    listStorePages(seller.id, seller.activeStoreId, environment),
    hasProFeature("pages"),
    hasProFeature("affiliates"),
    listProductCategories(seller.id, seller.activeStoreId),
  ]);
  const products = allProducts.filter((p) => p.status === "published");
  const publishedPages = pagesUnlocked ? storePages.filter(
    (page) => page.status === "published",
  ) : [];
  const topPages = publishedPages.filter((page) => page.navigation === "top");
  const footerPages = publishedPages.filter(
    (page) => page.navigation === "footer",
  );
  const isTestMode = environment === "sandbox";
  if (!store) notFound();
  const storefrontBasePath = getStorefrontBasePath(store, primaryStore);
  const categorizedProducts = categories
    .map((category) => ({
      category,
      products: products.filter((product) => product.categoryId === category.id),
    }))
    .filter((section) => section.products.length > 0);
  const uncategorizedProducts = products.filter(
    (product) =>
      !product.categoryId ||
      !categories.some((category) => category.id === product.categoryId),
  );

  return (
    <div className="flex min-h-screen flex-col">
      <VisitorAnalyticsTracker
        storeId={store.id}
        enabled={store.analyticsEnabled && !isTestMode}
      />
      {isTestMode && <StoreTestModeRibbon />}
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 pb-12">
        <StorefrontNavigation
          pages={topPages}
          basePath={storefrontBasePath}
          affiliatesEnabled={
            affiliatesUnlocked && store.affiliatesEnabled
          }
          showDashboard={viewer?.id === seller.id}
          className="mb-4 border border-border/60 rounded-full sticky top-4 bg-white/80 z-10 justify-center w-fit mx-auto px-4 backdrop-blur-xl"
        />

        <header
          className={clsx(
            "relative flex flex-col items-center text-center",
            seller.storeCoverImageUrl ? "" : "my-12"
          )}
        >
          {seller.storeCoverImageUrl && (
            <img
              src={seller.storeCoverImageUrl}
              alt={`${seller.storeName} store cover`}
              className="aspect-4/1 w-full object-cover -mb-6 -mt-10 rounded-2xl"
            />
          )}

          {store.logoImageUrl ? (
            <img
              src={store.logoImageUrl}
              alt={`${store.name} logo`}
              className="h-16 w-16 rounded-xl object-cover ring-4 ring-white"
            />
          ) : (
            <div className="rounded-xl ring-4 ring-white">
              <AppIcon size={48} />
            </div>
          )}
          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            {seller.storeName}
          </h1>
          <p className="mt-2 max-w-xl whitespace-pre-line text-muted">
            {store.description || `Digital products from ${seller.name}`}
          </p>
        </header>

        {products.length === 0 ? (
          <div
            className={`${cardClass} mt-10 px-6 py-16 text-center text-sm text-muted`}
          >
            No products published yet.
          </div>
        ) : (
          <div className="my-14 space-y-14">
            {!!uncategorizedProducts.length && (
              <StorefrontProductGrid
                products={uncategorizedProducts}
                isTestMode={isTestMode}
                displayPurchases={store.displayPurchasesEnabled}
              />
            )}
            {categorizedProducts.map(({ category, products: categoryProducts }) => (
              <section key={category.id}>
                <Link
                  href={`${storefrontBasePath}/${category.slug}`}
                  className="group inline-block"
                >
                  <h2 className="text-2xl font-semibold tracking-tight group-hover:text-accent-dark">
                    {category.name}
                  </h2>
                </Link>
                {category.description && (
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                    {category.description}
                  </p>
                )}
                <StorefrontProductGrid
                  products={categoryProducts}
                  isTestMode={isTestMode}
                  displayPurchases={store.displayPurchasesEnabled}
                  className="mt-6"
                />
              </section>
            ))}
          </div>
        )}
      </main>

      <StoreSubscribeForm storeSlug={seller.storeSlug} />
      <StorefrontFooter
        pages={footerPages}
        basePath={storefrontBasePath}
      />
    </div>
  );
}
