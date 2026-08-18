import Link from "next/link";
import { notFound } from "next/navigation";
import { AppIcon } from "@/components/dashboard/Icon";
import { StoreSubscribeForm } from "@/components/StoreSubscribeForm";
import { StorefrontFooter } from "@/components/StorefrontFooter";
import { StorefrontNavigation } from "@/components/StorefrontNavigation";
import { StoreTestModeRibbon } from "@/components/StoreTestModeRibbon";
import { cardClass } from "@/components/ui.styles";
import { getSessionUser } from "@/lib/auth";
import { findUserByStoreSlug, listProductsByUser } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { formatProductPriceSuffix } from "@/lib/product-billing";
import { getProductPublicPath } from "@/lib/product-paths";
import {
  formatLicenseUpdatePeriodLabel,
  isPerpetualLicenseProduct,
} from "@/lib/license-entitlements";
import { getProductDescriptionPlainText } from "@/components/product-description.utils";
import { getPrimaryStore, getStoreById } from "@/lib/stores";
import { getStorefrontBasePath } from "@/lib/storefront-paths";
import { listStorePages } from "@/lib/store-pages";
import { resolveStorefrontEnvironment } from "@/lib/storefront-environment.utils";
import { generateStorefrontMetadata } from "./page.utils";
import type { StorefrontPageProps } from "./page.types";
import clsx from "clsx";
import { hasProFeature } from "@/lib/app-license";

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
  ] = await Promise.all([
    getStoreById(seller.activeStoreId, seller.id),
    getPrimaryStore(),
    listProductsByUser(seller.id, seller.activeStoreId, environment),
    listStorePages(seller.id, seller.activeStoreId, environment),
    hasProFeature("pages"),
    hasProFeature("affiliates"),
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

  return (
    <div className="flex min-h-screen flex-col">
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
          <div className="my-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <Link
                key={p.id}
                href={`${getProductPublicPath(p)}${isTestMode ? "?preview" : ""}`}
                className={`group flex flex-col transition shadow-gray-300/20`}
              >
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="aspect-[16/9] w-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="flex h-28 items-center justify-center bg-accent-soft text-3xl">
                    📦
                  </div>
                )}
                <h2 className="mt-4 font-semibold group-hover:text-accent-dark">
                  {p.name}
                </h2>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted">
                  {getProductDescriptionPlainText(p.description) ||
                    "Digital product"}
                </p>
                <p className="mt-4 text-lg font-bold">
                  {formatMoney(p.price, p.currency)}
                  {formatProductPriceSuffix(p)}
                </p>
                {isPerpetualLicenseProduct(p) && (
                  <p className="mt-1 text-xs text-muted">
                    Lifetime use ·{" "}
                    {formatLicenseUpdatePeriodLabel(
                      p.licenseUpdatePeriodUnit || "year",
                      p.licenseUpdatePeriodCount,
                    )}{" "}
                    of updates
                  </p>
                )}
              </Link>
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
