import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ProductDescription } from "@/components/ProductDescription";
import { StoreTestModeRibbon } from "@/components/StoreTestModeRibbon";
import { VisitorAnalyticsTracker } from "@/components/VisitorAnalyticsTracker";
import { cardClass } from "@/components/ui.styles";
import { getSessionUser } from "@/lib/auth";
import { findProductByPublicIdentifier, findUserById } from "@/lib/db";
import {
  getPayPalCredentials,
  getStripeCredentials,
} from "@/lib/payment-credentials";
import {
  formatProductBillingSummary,
  formatProductPriceSuffix,
  isSubscriptionProduct,
} from "@/lib/product-billing";
import {
  formatLicenseUpdatePeriodLabel,
  isPerpetualLicenseProduct,
} from "@/lib/license-entitlements";
import { calculateCheckoutPricing } from "@/lib/product-pricing";
import { getStoreById } from "@/lib/stores";
import { CheckoutClient } from "./CheckoutClient";
import {
  buildProductSlugRedirectPath,
  formatProductPageMoney,
} from "./product-page.utils";
import { generateProductMetadata } from "./page-metadata.utils";
import type { BuyPageProps } from "./page.types";
import Powered from "@/components/PoweredBy";
import { getCustomerSession } from "@/lib/customer-auth";
import { scheduleCheckoutReminder } from "@/lib/checkout-reminders";
import { getRequestOrigin } from "@/lib/request-origin.utils";
import {
  parseCustomCheckoutAmount,
  resolveProductCheckoutPrice,
} from "@/lib/custom-product-amount";
import { parseCheckoutCustomData } from "@/lib/checkout-custom-data";
import { ProductConfigurationPicker } from "@/components/ProductConfigurationPicker";
import { resolveProductConfiguration } from "@/lib/product-configurations";

export const generateMetadata = generateProductMetadata;

export default async function BuyPage({ params, searchParams }: BuyPageProps) {
  const { productId } = await params;
  const resolvedSearchParams = await searchParams;
  const { amount, cancelled, discount, preview, ref } = resolvedSearchParams;
  const custom = parseCheckoutCustomData(resolvedSearchParams);

  const product = await findProductByPublicIdentifier(productId);
  if (!product) notFound();
  if (product.slug && productId === product.id && product.slug !== product.id) {
    redirect(buildProductSlugRedirectPath(product, resolvedSearchParams));
  }
  const isPreview = product.status !== "published";
  if (isPreview) {
    if (preview === undefined) notFound();
    const user = await getSessionUser();
    if (user?.id !== product.userId) notFound();
  }

  const [seller, store] = await Promise.all([
    findUserById(product.userId),
    getStoreById(product.storeId, product.userId),
  ]);
  if (!seller || !store) notFound();

  let customAmount: number | undefined;
  let checkoutPrice = product.price;
  try {
    customAmount = parseCustomCheckoutAmount(amount);
    checkoutPrice = resolveProductCheckoutPrice(product, customAmount);
  } catch {
    notFound();
  }
  const configuration = resolveProductConfiguration(
    product,
    custom,
    checkoutPrice,
  );
  checkoutPrice = configuration.price;

  const customer = await getCustomerSession();
  if (customer && product.status === "published") {
    await scheduleCheckoutReminder({
      userId: product.userId,
      storeId: product.storeId,
      productId: product.id,
      productSlug: product.slug,
      environment: product.environment,
      customerEmail: customer.email,
      customerName: customer.name,
      productName: product.name,
      customAmount: amount,
      custom: configuration.custom,
      requestUrl: getRequestOrigin(await headers()) || "http://localhost",
    }).catch((error) => {
      console.error("Could not schedule checkout reminder", error);
    });
  }

  const paypal =
    store.paymentGateway === "paypal"
      ? await getPayPalCredentials(
          product.userId,
          product.environment,
          product.storeId,
        )
      : undefined;
  const stripe =
    store.paymentGateway === "stripe"
      ? await getStripeCredentials(
          product.userId,
          product.environment,
          product.storeId,
        )
      : undefined;
  const initialPricing = calculateCheckoutPricing(product, 0, checkoutPrice);
  const isSandbox = product.environment === "sandbox";
  const perpetualLicense = isPerpetualLicenseProduct(product);
  const priceSuffix = perpetualLicense ? "" : formatProductPriceSuffix(product);
  const billingSummary = formatProductBillingSummary(product);
  const perpetualUpdateSummary = perpetualLicense
    ? `Includes ${formatLicenseUpdatePeriodLabel(
        product.licenseUpdatePeriodUnit || "year",
        product.licenseUpdatePeriodCount,
      )} of product updates`
    : undefined;

  return (
    <div className="min-h-screen bg-white">
      <VisitorAnalyticsTracker
        storeId={store.id}
        enabled={store.analyticsEnabled && !isSandbox && !isPreview}
      />
      {isPreview && (
        <div className="bg-amber-100 px-6 py-2 text-center text-sm text-amber-900">
          Preview — this is a draft product
        </div>
      )}
      {isSandbox && <StoreTestModeRibbon />}

      <main className="mx-auto flex lg:flex-row max-w-5xl px-4 pb-10 pt-5 gap-8 lg:gap-14">
        <div className="flex flex-col gap-6 flex-1 min-h-0 min-w-0 lg:sticky lg:top-6">
          <div className="flex-1">
            <header className="mx-auto flex w-full max-w-5xl items-center justify-between pb-4 mb-4 border-b border-border">
              <div className="flex h-8 items-center">
                <Link
                  className="flex flex-row items-end gap-2"
                  href={`/s/${store.slug}`}
                  aria-label={`${store.name} store`}
                >
                  {store.logoImageUrl && (
                    <img
                      src={store.logoImageUrl}
                      alt={`${store.name} logo`}
                      className="h-6 w-6 rounded-lg object-cover"
                    />
                  )}
                  {store.name}
                </Link>
              </div>
            </header>

            <div className="mb-6 flex items-start justify-between gap-6">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {product.name}
                </h1>
                {store.displayPurchasesEnabled && product.purchaseCount > 0 ? (
                  <p className="mt-2 text-sm text-muted">
                    {product.purchaseCount.toLocaleString()} purchased
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xl font-bold sm:text-3xl">
                  {formatProductPageMoney(checkoutPrice, product.currency)}
                  {priceSuffix}
                </p>
                {perpetualUpdateSummary ? (
                  <p className="mt-1 max-w-56 text-xs leading-5 text-muted">
                    {perpetualUpdateSummary}
                  </p>
                ) : billingSummary ? (
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {billingSummary}
                  </p>
                ) : null}
              </div>
            </div>

            <ProductConfigurationPicker
              options={product.options}
              bundles={product.bundles}
              selectedOptionId={configuration.selectedOption?.id}
              selectedBundleChoiceIds={Object.fromEntries(
                product.bundles.map((bundle) => [
                  bundle.id,
                  configuration.selectedBundleChoices
                    .filter((selection) => selection.bundle.id === bundle.id)
                    .map((selection) => selection.choice.id),
                ]),
              )}
              currency={product.currency}
            />

            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="aspect-video w-full object-cover rounded-xl mb-6"
              />
            )}
            {product.description && (
              <ProductDescription
                value={product.description}
                className="mt-6"
              />
            )}
          </div>

          <Powered />
        </div>

        <div className="w-86">
          <div className={`${cardClass} sticky top-6 overflow-hidden`}>
            {/* <h2 className="font-semibold px-6 py-3 border-b border-border">
              Checkout
            </h2> */}

            {cancelled && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Payment was cancelled. You can try again below.
              </p>
            )}

            <CheckoutClient
              productId={product.id}
              productName={product.name}
              productPrice={checkoutPrice}
              defaultProductPrice={product.price}
              customAmountEnabled={product.customAmountEnabled}
              customAmount={customAmount}
              custom={configuration.custom}
              affiliateRef={ref?.trim() || undefined}
              initialDiscountCode={discount?.trim() || undefined}
              initialTransactionFeeAmount={initialPricing.transactionFeeAmount}
              paypalClientId={paypal?.clientId}
              stripeEnabled={Boolean(stripe)}
              mode={paypal?.mode || stripe?.mode || "sandbox"}
              currency={product.currency}
              isSubscription={isSubscriptionProduct(product)}
              billingSummary={billingSummary}
              priceSuffix={priceSuffix}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
