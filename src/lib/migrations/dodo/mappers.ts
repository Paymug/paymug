import {
  slugify,
  uniqueSlug,
  type MappedCustomer,
  type MappedDiscount,
  type MappedLicense,
  type MappedLicenseInstance,
  type MappedOrder,
  type MappedProduct,
  type MappedSubscription,
  type MappedVariant,
} from "../../lemonsqueezy/mappers";
import type { DodoResource } from "./client";

export const dodoSource = "dodo";

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const arr = (v: unknown): DodoResource[] => (Array.isArray(v) ? (v as DodoResource[]) : []);
const unit = (v: unknown): "week" | "month" | "year" | null => {
  const s = String(v ?? "").toLowerCase();
  return s === "week" || s === "month" || s === "year" ? s : null;
};

export interface DodoFileRef {
  fileId: string;
  filename: string;
  contentType: string | null;
  size: number;
}

export interface MappedDodoProduct {
  /** Null when the product cannot be represented (usage-based). */
  product: MappedProduct | null;
  variant: MappedVariant | null;
  files: DodoFileRef[];
  notes: string[];
}

export function mapDodoProduct(resource: DodoResource, usedSlugs: Set<string>): MappedDodoProduct {
  const name = str(resource.name) || `Product ${resource.product_id}`;
  const detail = (resource.price_detail ?? {}) as DodoResource;
  const notes: string[] = [];
  if (detail.type === "usage_based_price") {
    return {
      product: null,
      variant: null,
      files: [],
      notes: [`${name}: usage-based products are not supported; skipped.`],
    };
  }
  const recurring = resource.is_recurring === true || detail.type === "recurring_price";
  const price = num(detail.price) ?? num(resource.price) ?? 0;
  const pwyw = detail.pay_what_you_want === true;
  const variantSlug = slugify(name, "default");
  const productSourceId = String(resource.product_id);
  const config = { license: null as DodoResource | null, github: null as DodoResource | null };
  const files: DodoFileRef[] = [];
  let delivery: string | null = null;
  for (const entitlement of arr(resource.entitlements)) {
    const cfg = (entitlement.integration_config ?? {}) as DodoResource;
    switch (entitlement.integration_type) {
      case "license_key":
        config.license = cfg;
        break;
      case "github":
        config.github = cfg;
        break;
      case "digital_files":
        for (const file of arr(cfg.digital_files?.files)) {
          files.push({
            fileId: String(file.file_id),
            filename: str(file.filename) || `file-${file.file_id}`,
            contentType: str(file.content_type),
            size: num(file.file_size) ?? 0,
          });
        }
        if (str(cfg.digital_files?.instructions)) delivery = str(cfg.digital_files.instructions);
        break;
      default:
        notes.push(`${name}: ${String(entitlement.integration_type)} entitlement needs manual setup.`);
    }
  }
  const repo = str(config.github?.target_id);
  const [owner, repoName] = repo?.includes("/") ? repo.split("/") : [null, repo];
  const trial = num(detail.trial_period_days);
  const licensed = config.license !== null;
  const durationCount = num(config.license?.duration_count);
  const durationUnit = String(config.license?.duration_interval ?? "").toLowerCase();
  const limit = num(config.license?.activations_limit);
  const product: MappedProduct = {
    sourceId: productSourceId,
    name,
    slug: uniqueSlug(slugify(name, "product"), usedSlugs),
    description: str(resource.description) || "",
    price,
    status: "published",
    imageUrl: str(resource.image),
    storeSourceId: str(resource.business_id),
  };
  const variant: MappedVariant = {
    sourceId: productSourceId,
    productSourceId,
    name,
    slug: uniqueSlug(variantSlug, new Set()),
    description: "",
    sort: 0,
    status: "published",
    price,
    customAmountEnabled: pwyw ? true : null,
    minPrice: pwyw ? price : null,
    suggestedPrice: pwyw ? num(detail.suggested_price) : null,
    billingType: recurring ? "subscription" : "one_time",
    intervalUnit: recurring ? unit(detail.payment_frequency_interval) : null,
    intervalCount: recurring ? num(detail.payment_frequency_count) ?? 1 : null,
    trialDays: recurring && trial && trial > 0 ? trial : null,
    generateLicense: licensed ? true : null,
    licenseSeatLimit: licensed ? limit : undefined,
    licenseType: licensed ? (durationCount ? "standard" : "perpetual") : null,
    licenseUpdatePeriodUnit:
      licensed && durationCount && (durationUnit === "day" || durationUnit === "month" || durationUnit === "year")
        ? durationUnit
        : null,
    licenseUpdatePeriodCount: licensed && durationCount ? durationCount : null,
    githubRepoOwner: owner,
    githubRepoName: repoName,
    deliveryContent: delivery,
  };
  if (arr(resource.entitlements).length === 0 && detail.pricing_mode) {
    notes.push(`${name}: localized prices are not imported (base currency only).`);
  }
  return { product, variant, files, notes };
}

export function mapDodoCustomer(resource: DodoResource): MappedCustomer | null {
  const email = str(resource.email)?.toLowerCase();
  if (!email) return null;
  return {
    sourceId: String(resource.customer_id),
    email,
    name: str(resource.name) || email,
    createdAt: str(resource.created_at),
    ordersCount: 0,
    totalSpent: 0,
  };
}

/** Needs the payment detail for `product_cart`; list rows have no product. */
export function mapDodoPayment(list: DodoResource, detail: DodoResource | null): MappedOrder | null {
  const email = str(list.customer?.email)?.toLowerCase();
  if (!email || list.status !== "succeeded") return null;
  const cart = arr(detail?.product_cart);
  const productId = str(cart[0]?.product_id);
  const createdAt = str(list.created_at) || new Date(0).toISOString();
  return {
    sourceId: String(list.payment_id),
    productSourceId: productId,
    variantSourceId: productId,
    productName: "Imported product",
    variantName: null,
    email,
    customerName: str(list.customer?.name),
    currency: (str(list.currency) || "USD").toUpperCase(),
    amount: Math.max(0, Math.round(num(list.total_amount) ?? 0)),
    discountAmount: 0,
    status: list.refund_status === "full" || list.refund_status === "partial" ? "refunded" : "paid",
    createdAt,
    paidAt: createdAt,
  };
}

export function mapDodoLicense(
  resource: DodoResource,
  customer: DodoResource | null,
): MappedLicense | null {
  const key = str(resource.key);
  const email = str(customer?.email)?.toLowerCase();
  if (!key || !email) return null;
  const limit = num(resource.activations_limit);
  return {
    sourceId: String(resource.id),
    orderSourceId: str(resource.payment_id),
    productSourceId: str(resource.product_id),
    key,
    email,
    activationLimit: limit && limit > 0 ? limit : null,
    expiresAt: str(resource.expires_at),
    status: resource.status === "active" ? "active" : "inactive",
    createdAt: str(resource.created_at) || new Date(0).toISOString(),
  };
}

export function mapDodoInstance(resource: DodoResource): MappedLicenseInstance {
  return {
    id: String(resource.id),
    name: str(resource.name) || "",
    createdAt: str(resource.created_at) || new Date(0).toISOString(),
  };
}

export function mapDodoDiscount(resource: DodoResource): MappedDiscount | null {
  const code = str(resource.code)?.toUpperCase();
  const amount = num(resource.amount);
  if (!code || amount === null) return null;
  const percent = resource.type === "percentage";
  const restricted: string[] = Array.isArray(resource.restricted_to)
    ? (resource.restricted_to as unknown[]).map(String)
    : [];
  const expires = str(resource.expires_at);
  return {
    sourceId: String(resource.discount_id),
    code,
    type: percent ? "percentage" : "fixed",
    // Percentages are basis points (540 = 5.4%); flat amounts are minor units.
    value: amount / 100,
    usageLimit: num(resource.usage_limit) ?? 0,
    usageCount: num(resource.times_used) ?? 0,
    startsAt: str(resource.starts_at),
    expiresAt: expires,
    limitedToProducts: restricted.length > 0,
    productSourceIds: restricted,
    active: !expires || Date.parse(expires) > Date.now(),
    createdAt: str(resource.created_at),
  };
}

const billingStatuses = new Set(["active", "on_hold", "paused", "past_due"]);

export function mapDodoSubscription(resource: DodoResource): MappedSubscription | null {
  const email = str(resource.customer?.email)?.toLowerCase();
  if (!email) return null;
  const status = String(resource.status);
  const productId = str(resource.product_id);
  return {
    sourceId: String(resource.subscription_id),
    productSourceId: productId,
    variantSourceId: productId,
    orderSourceId: null,
    productName: str(resource.product_name) || "Imported product",
    variantName: null,
    email,
    name: str(resource.customer?.name),
    lsStatus: status,
    // No documented card export: re-subscribe until a mapping file is uploaded.
    paymentProcessor: "unknown",
    cardBrand: null,
    cardLast4: null,
    renewsAt: str(resource.next_billing_date),
    endsAt: null,
    trialEndsAt: null,
    billingAnchor: null,
    createdAt: str(resource.created_at),
    billing: billingStatuses.has(status) && resource.cancel_at_next_billing_date !== true,
    sourceCustomerId: str(resource.customer?.customer_id),
    sourcePaymentMethodId: str(resource.payment_method_id),
    migrationState: "needs_resubscribe",
  };
}
