import type {
  ProductBillingType,
  ProductIntervalUnit,
  ProductLicenseType,
  ProductLicenseUpdatePeriodUnit,
} from "./types";
import type { ProductFile } from "./product-files.types";

/** Fields a variant may override. `null`/`undefined` means inherit from the product. */
export interface ProductVariantRecord {
  id: string;
  productId: string;
  name: string;
  slug: string;
  description: string;
  sort: number;
  status: "draft" | "published";
  price: number;
  customAmountEnabled?: boolean | null;
  minPrice?: number | null;
  suggestedPrice?: number | null;
  billingType?: ProductBillingType | null;
  intervalUnit?: ProductIntervalUnit | null;
  intervalCount?: number | null;
  trialDays?: number | null;
  productFiles?: ProductFile[] | null;
  generateLicense?: boolean | null;
  licenseType?: ProductLicenseType | null;
  licenseSeatLimit?: number | null;
  licenseUpdatePeriodUnit?: ProductLicenseUpdatePeriodUnit | null;
  licenseUpdatePeriodCount?: number | null;
  deliveryContent?: string | null;
  redirectUrl?: string | null;
  githubRepoOwner?: string | null;
  githubRepoName?: string | null;
}

/** Product-level defaults a variant can override. */
export interface VariantBaseProduct {
  price: number;
  billingType: ProductBillingType;
  intervalUnit?: ProductIntervalUnit | null;
  intervalCount: number;
  trialDays: number;
  customAmountEnabled: boolean;
  productFiles: ProductFile[];
  generateLicense: boolean;
  licenseType: ProductLicenseType;
  licenseSeatLimit: number | null;
  licenseUpdatePeriodUnit?: ProductLicenseUpdatePeriodUnit | null;
  licenseUpdatePeriodCount: number;
  deliveryContent?: string | null;
  redirectUrl?: string | null;
  githubRepoOwner?: string | null;
  githubRepoName?: string | null;
}

export interface EffectiveVariantConfig extends VariantBaseProduct {
  variantId?: string;
  variantName?: string;
  minPrice: number | null;
  suggestedPrice: number | null;
}

function pick<T>(override: T | null | undefined, fallback: T): T {
  return override === null || override === undefined ? fallback : override;
}

/**
 * Product = defaults, variant = overrides. Returns the effective config used by
 * checkout, fulfillment, license issuance, subscriptions and the API.
 */
export function resolveVariant(
  product: VariantBaseProduct,
  variant?: ProductVariantRecord | null,
): EffectiveVariantConfig {
  if (!variant) {
    return { ...product, minPrice: null, suggestedPrice: null };
  }
  return {
    price: variant.price,
    billingType: pick(variant.billingType, product.billingType),
    intervalUnit: pick(variant.intervalUnit, product.intervalUnit ?? null),
    intervalCount: pick(variant.intervalCount, product.intervalCount),
    trialDays: pick(variant.trialDays, product.trialDays),
    customAmountEnabled: pick(
      variant.customAmountEnabled,
      product.customAmountEnabled,
    ),
    productFiles: pick(variant.productFiles, product.productFiles),
    generateLicense: pick(variant.generateLicense, product.generateLicense),
    licenseType: pick(variant.licenseType, product.licenseType),
    // null is a meaningful value (unlimited), so only `undefined` inherits.
    licenseSeatLimit:
      variant.licenseSeatLimit === undefined
        ? product.licenseSeatLimit
        : variant.licenseSeatLimit,
    licenseUpdatePeriodUnit: pick(
      variant.licenseUpdatePeriodUnit,
      product.licenseUpdatePeriodUnit ?? null,
    ),
    licenseUpdatePeriodCount: pick(
      variant.licenseUpdatePeriodCount,
      product.licenseUpdatePeriodCount,
    ),
    deliveryContent: pick(
      variant.deliveryContent,
      product.deliveryContent ?? null,
    ),
    redirectUrl: pick(variant.redirectUrl, product.redirectUrl ?? null),
    githubRepoOwner: pick(
      variant.githubRepoOwner,
      product.githubRepoOwner ?? null,
    ),
    githubRepoName: pick(
      variant.githubRepoName,
      product.githubRepoName ?? null,
    ),
    variantId: variant.id,
    variantName: variant.name,
    minPrice: variant.minPrice ?? null,
    suggestedPrice: variant.suggestedPrice ?? null,
  };
}

/** Picks the requested published variant, else the first by sort order. */
export function selectVariant(
  variants: ProductVariantRecord[],
  requestedId?: string | null,
): ProductVariantRecord | undefined {
  const published = variants
    .filter((variant) => variant.status === "published")
    .sort((a, b) => a.sort - b.sort);
  return (
    published.find((variant) => variant.id === requestedId) || published[0]
  );
}

export function getVariantStartingPrice(
  variants: ProductVariantRecord[],
  fallback: number,
): number {
  const published = variants.filter((variant) => variant.status === "published");
  return published.length
    ? Math.min(...published.map((variant) => variant.price))
    : fallback;
}

interface VariantMarkers {
  variantId?: string;
  variantName?: string;
  /** Pay-what-you-want floor and suggestion from the variant, in cents. */
  minPrice?: number | null;
  suggestedPrice?: number | null;
}

/** Checkout custom-data key that carries the chosen variant ID (legacy option key). */
export const variantCustomKey = "product_option";

/** Fields of a product that a variant can override, plus the variant markers. */
type OverlayableProduct = VariantBaseProduct & {
  variants?: ProductVariantRecord[];
  variantId?: string;
  variantName?: string;
};

/**
 * Returns the product as sold for `variant`: variant overrides applied over the
 * product defaults. Without a variant the product is returned unchanged.
 */
export function applyVariantToProduct<T extends OverlayableProduct>(
  product: T,
  variant?: ProductVariantRecord | null,
): T & VariantMarkers {
  if (!variant) return product;
  const effective = resolveVariant(product, variant);
  return {
    ...product,
    price: effective.price,
    billingType: effective.billingType,
    intervalUnit: effective.intervalUnit,
    intervalCount: effective.intervalCount,
    trialDays: effective.trialDays,
    customAmountEnabled: effective.customAmountEnabled,
    productFiles: effective.productFiles,
    generateLicense: effective.generateLicense,
    licenseType: effective.licenseType,
    licenseSeatLimit: effective.licenseSeatLimit,
    licenseUpdatePeriodUnit: effective.licenseUpdatePeriodUnit,
    licenseUpdatePeriodCount: effective.licenseUpdatePeriodCount,
    deliveryContent: effective.deliveryContent ?? undefined,
    redirectUrl: effective.redirectUrl ?? undefined,
    githubRepoOwner: effective.githubRepoOwner ?? undefined,
    githubRepoName: effective.githubRepoName ?? undefined,
    variantId: variant.id,
    variantName: variant.name,
    minPrice: effective.minPrice,
    suggestedPrice: effective.suggestedPrice,
  };
}

/**
 * Picks the variant requested by checkout custom data (first published one by
 * default) and applies it. Products without variants pass through.
 */
export function effectiveProduct<T extends OverlayableProduct>(
  product: T,
  custom?: Record<string, string | undefined> | null,
): T & VariantMarkers {
  if (!product.variants?.length) return product;
  return applyVariantToProduct(
    product,
    selectVariant(product.variants, custom?.[variantCustomKey]),
  );
}

/** Product as it was sold on an order (by stored variant ID, else custom data). */
export function productForOrder<T extends OverlayableProduct>(
  product: T,
  order: { variantId?: string | null; custom?: Record<string, string | undefined> | null },
): T & VariantMarkers {
  if (!product.variants?.length) return product;
  const id = order.variantId || order.custom?.[variantCustomKey];
  const variant =
    product.variants.find((candidate) => candidate.id === id) ||
    selectVariant(product.variants, id);
  return applyVariantToProduct(product, variant);
}

/**
 * `product_variants.license_seat_limit`: NULL inherits from the product,
 * 0 means unlimited seats, n >= 1 is a fixed limit.
 */
export function seatLimitFromColumn(value: number | null): number | null | undefined {
  if (value === null) return undefined;
  return value === 0 ? null : value;
}

export function seatLimitToColumn(value: number | null | undefined): number | null {
  if (value === undefined) return null;
  return value === null ? 0 : value;
}
