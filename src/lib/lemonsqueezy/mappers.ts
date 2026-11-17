import type { LsResource } from "./types";

export const lemonSqueezySource = "lemonsqueezy";

type Attrs = Record<string, unknown>;

const str = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const bool = (value: unknown): boolean => value === true;

export function slugify(value: string, fallback = "item"): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || fallback;
}

/** Returns `base`, or `base-2`, `base-3`… not present in `used`; adds the result. */
export function uniqueSlug(base: string, used: Set<string>): string {
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

export function lsModeToEnvironment(mode: "test" | "live"): "sandbox" | "live" {
  return mode === "test" ? "sandbox" : "live";
}

const intervalMap: Record<string, "week" | "month" | "year" | undefined> = {
  day: undefined,
  week: "week",
  month: "month",
  year: "year",
};

// ---------------------------------------------------------------- products
export interface MappedProduct {
  sourceId: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  status: "draft" | "published";
  imageUrl: string | null;
  storeSourceId: string | null;
}

export function mapProduct(resource: LsResource, usedSlugs: Set<string>): MappedProduct {
  const a = resource.attributes as Attrs;
  const name = str(a.name) || `Product ${resource.id}`;
  return {
    sourceId: resource.id,
    name,
    slug: uniqueSlug(slugify(str(a.slug) || name, "product"), usedSlugs),
    description: str(a.description) || "",
    price: Math.max(0, Math.round(num(a.price) ?? 0)),
    status: a.status === "published" ? "published" : "draft",
    imageUrl: str(a.large_thumb_url) || str(a.thumb_url),
    storeSourceId: a.store_id != null ? String(a.store_id) : null,
  };
}

// ---------------------------------------------------------------- variants
export interface MappedVariant {
  sourceId: string;
  productSourceId: string;
  name: string;
  slug: string;
  description: string;
  sort: number;
  status: "draft" | "published";
  price: number;
  customAmountEnabled: boolean | null;
  minPrice: number | null;
  suggestedPrice: number | null;
  billingType: "one_time" | "subscription" | null;
  intervalUnit: "week" | "month" | "year" | null;
  intervalCount: number | null;
  trialDays: number | null;
  /** True when LS licenses are enabled for this variant. */
  generateLicense: boolean | null;
  licenseSeatLimit: number | null | undefined;
  licenseType: "standard" | "perpetual" | null;
  licenseUpdatePeriodUnit: "day" | "week" | "month" | "year" | null;
  licenseUpdatePeriodCount: number | null;
  /** Optional delivery overrides filled by non-LS sources. */
  githubRepoOwner?: string | null;
  githubRepoName?: string | null;
  deliveryContent?: string | null;
}

function trialDaysFrom(a: Attrs): number | null {
  if (!bool(a.has_free_trial)) return null;
  const count = num(a.trial_interval_count) ?? 0;
  switch (a.trial_interval) {
    case "week":
      return count * 7;
    case "month":
      return count * 30;
    case "year":
      return count * 365;
    default:
      return count;
  }
}

export function mapVariant(resource: LsResource, usedSlugs: Set<string>): MappedVariant {
  const a = resource.attributes as Attrs;
  const name = str(a.name) || `Variant ${resource.id}`;
  const isSubscription = bool(a.is_subscription);
  const unit = isSubscription ? intervalMap[String(a.interval)] ?? null : null;
  const licensed = bool(a.has_license_keys);
  const activationLimit = num(a.license_activation_limit);
  const unlimited = bool(a.is_license_limit_unlimited);
  const lengthUnit = str(a.license_length_unit);
  const lengthValue = num(a.license_length_value);
  const lifetime = bool(a.is_license_length_unlimited);
  return {
    sourceId: resource.id,
    productSourceId: String(a.product_id),
    name,
    slug: uniqueSlug(slugify(str(a.slug) || name, "variant"), usedSlugs),
    description: str(a.description) || "",
    sort: num(a.sort) ?? 0,
    status: a.status === "published" ? "published" : "draft",
    price: Math.max(0, Math.round(num(a.price) ?? 0)),
    customAmountEnabled: bool(a.pay_what_you_want) ? true : null,
    minPrice: bool(a.pay_what_you_want) ? num(a.min_price) : null,
    suggestedPrice: bool(a.pay_what_you_want) ? num(a.suggested_price) : null,
    billingType: isSubscription ? "subscription" : "one_time",
    intervalUnit: unit,
    intervalCount: isSubscription ? num(a.interval_count) ?? 1 : null,
    trialDays: trialDaysFrom(a),
    generateLicense: licensed,
    licenseSeatLimit: licensed ? (unlimited ? null : activationLimit ?? 1) : undefined,
    licenseType: licensed ? (lifetime || !lengthUnit ? "perpetual" : "standard") : null,
    licenseUpdatePeriodUnit:
      licensed && !lifetime && (lengthUnit === "days" || lengthUnit === "months" || lengthUnit === "years")
        ? (({ days: "day", months: "month", years: "year" } as const)[lengthUnit])
        : null,
    licenseUpdatePeriodCount: licensed && !lifetime ? lengthValue : null,
  };
}

// ------------------------------------------------------------------- files
export interface MappedFile {
  sourceId: string;
  variantSourceId: string;
  name: string;
  version: string | null;
  sort: number;
  size: number;
  type: string;
  downloadUrl: string | null;
}

const mimeByExtension: Record<string, string> = {
  pdf: "application/pdf",
  zip: "application/zip",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  txt: "text/plain",
  json: "application/json",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  epub: "application/epub+zip",
};

export function mapFile(resource: LsResource): MappedFile {
  const a = resource.attributes as Attrs;
  const ext = (str(a.extension) || "").replace(/^\./, "").toLowerCase();
  const baseName = str(a.name) || `file-${resource.id}`;
  return {
    sourceId: resource.id,
    variantSourceId: String(a.variant_id),
    name: ext && !baseName.toLowerCase().endsWith(`.${ext}`) ? `${baseName}.${ext}` : baseName,
    version: str(a.version),
    sort: num(a.sort) ?? 0,
    size: Math.max(0, num(a.size) ?? 0),
    type: mimeByExtension[ext] || "application/octet-stream",
    downloadUrl: str(a.download_url),
  };
}

// --------------------------------------------------------------- customers
export interface MappedCustomer {
  sourceId: string;
  email: string;
  name: string;
  createdAt: string | null;
  ordersCount: number;
  totalSpent: number;
}

export function mapCustomer(resource: LsResource): MappedCustomer | null {
  const a = resource.attributes as Attrs;
  const email = str(a.email)?.toLowerCase();
  if (!email) return null;
  return {
    sourceId: resource.id,
    email,
    name: str(a.name) || email,
    createdAt: str(a.created_at),
    ordersCount: 0,
    totalSpent: 0,
  };
}

/** Merge customers sharing a lower-cased email; first one wins the name. */
export function dedupeCustomers(customers: MappedCustomer[]): MappedCustomer[] {
  const byEmail = new Map<string, MappedCustomer>();
  for (const customer of customers) {
    const existing = byEmail.get(customer.email);
    if (!existing) byEmail.set(customer.email, { ...customer });
    else {
      existing.ordersCount += customer.ordersCount;
      existing.totalSpent += customer.totalSpent;
    }
  }
  return [...byEmail.values()];
}

// ------------------------------------------------------------------ orders
export interface MappedOrder {
  sourceId: string;
  productSourceId: string | null;
  variantSourceId: string | null;
  productName: string;
  variantName: string | null;
  email: string;
  customerName: string | null;
  currency: string;
  amount: number;
  discountAmount: number;
  status: "paid" | "refunded" | "failed" | "pending";
  createdAt: string;
  paidAt: string | null;
}

export function mapOrder(resource: LsResource): MappedOrder | null {
  const a = resource.attributes as Attrs;
  const email = str(a.user_email)?.toLowerCase();
  if (!email) return null;
  const item = (a.first_order_item ?? {}) as Attrs;
  const status =
    a.status === "refunded" || a.status === "partial_refund" || a.status === "fraudulent"
      ? "refunded"
      : a.status === "paid"
        ? "paid"
        : a.status === "failed"
          ? "failed"
          : "pending";
  const createdAt = str(a.created_at) || new Date(0).toISOString();
  return {
    sourceId: resource.id,
    productSourceId: item.product_id != null ? String(item.product_id) : null,
    variantSourceId: item.variant_id != null ? String(item.variant_id) : null,
    productName: str(item.product_name) || "Imported product",
    variantName: str(item.variant_name),
    email,
    customerName: str(a.user_name),
    currency: (str(a.currency) || "USD").toUpperCase(),
    amount: Math.max(0, Math.round(num(a.total) ?? 0)),
    discountAmount: Math.max(0, Math.round(num(a.discount_total) ?? 0)),
    status,
    createdAt,
    paidAt: status === "paid" || status === "refunded" ? createdAt : null,
  };
}

// ---------------------------------------------------------------- licenses
export interface MappedLicense {
  sourceId: string;
  orderSourceId: string | null;
  productSourceId: string | null;
  key: string;
  email: string;
  activationLimit: number | null;
  expiresAt: string | null;
  status: "active" | "inactive";
  createdAt: string;
}

export function mapLicense(resource: LsResource): MappedLicense | null {
  const a = resource.attributes as Attrs;
  const key = str(a.key);
  const email = str(a.user_email)?.toLowerCase();
  if (!key || !email) return null;
  const limit = num(a.activation_limit);
  const lsStatus = String(a.status);
  return {
    sourceId: resource.id,
    orderSourceId: a.order_id != null ? String(a.order_id) : null,
    productSourceId: a.product_id != null ? String(a.product_id) : null,
    key,
    email,
    // LS uses 0 / null for unlimited activations.
    activationLimit: limit && limit > 0 ? limit : null,
    expiresAt: str(a.expires_at),
    status: bool(a.disabled) || lsStatus === "disabled" ? "inactive" : "active",
    createdAt: str(a.created_at) || new Date(0).toISOString(),
  };
}

export interface MappedLicenseInstance {
  id: string;
  name: string;
  createdAt: string;
}

export function mapLicenseInstance(resource: LsResource): MappedLicenseInstance {
  const a = resource.attributes as Attrs;
  return {
    id: str(a.identifier) || resource.id,
    name: str(a.name) || "",
    createdAt: str(a.created_at) || new Date(0).toISOString(),
  };
}

// --------------------------------------------------------------- discounts
export interface MappedDiscount {
  sourceId: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  usageLimit: number;
  usageCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  limitedToProducts: boolean;
  productSourceIds: string[];
  active: boolean;
  createdAt: string | null;
}

export function mapDiscount(
  resource: LsResource,
  productSourceIds: string[] = [],
): MappedDiscount | null {
  const a = resource.attributes as Attrs;
  const code = str(a.code)?.toUpperCase();
  const amount = num(a.amount);
  if (!code || amount === null) return null;
  const percent = a.amount_type === "percent";
  return {
    sourceId: resource.id,
    code,
    type: percent ? "percentage" : "fixed",
    // Paymug stores fixed discounts in major units.
    value: percent ? amount : amount / 100,
    usageLimit: bool(a.is_limited_redemptions) ? num(a.max_redemptions) ?? 0 : 0,
    usageCount: 0,
    startsAt: str(a.starts_at),
    expiresAt: str(a.expires_at),
    limitedToProducts: bool(a.is_limited_to_products),
    productSourceIds,
    active: a.status !== "draft" && a.status !== "expired",
    createdAt: str(a.created_at),
  };
}

// -------------------------------------------------------------- affiliates
export interface MappedAffiliate {
  sourceId: string;
  email: string;
  name: string;
  code: string;
  status: "active" | "inactive";
  totalEarnings: number;
  unpaidEarnings: number;
  commissionRate: number | null;
  createdAt: string | null;
}

export function mapAffiliate(resource: LsResource, usedCodes: Set<string>): MappedAffiliate | null {
  const a = resource.attributes as Attrs;
  const email = str(a.user_email)?.toLowerCase();
  if (!email) return null;
  const base = slugify(email.split("@")[0], "affiliate");
  return {
    sourceId: resource.id,
    email,
    name: str(a.user_name) || email,
    code: uniqueSlug(base, usedCodes),
    status: a.status === "active" ? "active" : "inactive",
    totalEarnings: (num(a.total_earnings) ?? 0) / 100,
    unpaidEarnings: (num(a.unpaid_earnings) ?? 0) / 100,
    commissionRate: null,
    createdAt: str(a.created_at),
  };
}

// ----------------------------------------------------------- subscriptions
export interface MappedSubscription {
  sourceId: string;
  productSourceId: string | null;
  variantSourceId: string | null;
  orderSourceId: string | null;
  productName: string;
  variantName: string | null;
  email: string;
  name: string | null;
  lsStatus: string;
  paymentProcessor: "stripe" | "paypal" | "unknown";
  cardBrand: string | null;
  cardLast4: string | null;
  renewsAt: string | null;
  endsAt: string | null;
  trialEndsAt: string | null;
  billingAnchor: number | null;
  createdAt: string | null;
  /** True for subscriptions that still bill, so they need a migration path. */
  billing: boolean;
  /** Source customer / payment method ids, for exact Stripe linking. */
  sourceCustomerId?: string | null;
  sourcePaymentMethodId?: string | null;
  /** Overrides the default migration state derived from the processor. */
  migrationState?: "needs_resubscribe" | "waiting_for_cards" | "not_required";
}

export function mapSubscription(resource: LsResource): MappedSubscription | null {
  const a = resource.attributes as Attrs;
  const email = str(a.user_email)?.toLowerCase();
  if (!email) return null;
  const status = String(a.status);
  const processor = String(a.payment_processor);
  return {
    sourceId: resource.id,
    productSourceId: a.product_id != null ? String(a.product_id) : null,
    variantSourceId: a.variant_id != null ? String(a.variant_id) : null,
    orderSourceId: a.order_id != null ? String(a.order_id) : null,
    productName: str(a.product_name) || "Imported product",
    variantName: str(a.variant_name),
    email,
    name: str(a.user_name),
    lsStatus: status,
    paymentProcessor:
      processor === "stripe" || processor === "paypal" ? processor : "unknown",
    cardBrand: str(a.card_brand),
    cardLast4: str(a.card_last_four),
    renewsAt: str(a.renews_at),
    endsAt: str(a.ends_at),
    trialEndsAt: str(a.trial_ends_at),
    billingAnchor: num(a.billing_anchor),
    createdAt: str(a.created_at),
    billing: ["active", "on_trial", "past_due", "paused", "unpaid"].includes(status),
  };
}
