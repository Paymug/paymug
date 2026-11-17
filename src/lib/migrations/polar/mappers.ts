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
import type { PolarResource } from "./client";

export const polarSource = "polar";

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const arr = (v: unknown): PolarResource[] => (Array.isArray(v) ? (v as PolarResource[]) : []);

export interface PolarNote {
  /** Product the note applies to. */
  sourceId: string;
  message: string;
}

export interface MappedPolarProduct {
  product: MappedProduct;
  variants: MappedVariant[];
  /** One entry per benefit-derived follow-up the seller must do by hand. */
  notes: PolarNote[];
  /** Benefit ids of this product, to link license keys back to it. */
  benefitIds: string[];
}

const dayCount = (unit: unknown, count: number): number => {
  switch (unit) {
    case "week":
      return count * 7;
    case "month":
      return count * 30;
    case "year":
      return count * 365;
    default:
      return count;
  }
};

const intervalUnit = (unit: unknown): "week" | "month" | "year" | null =>
  unit === "week" || unit === "month" || unit === "year" ? unit : null;

function priceLabel(price: PolarResource, recurring: string | null): string {
  const suffix = recurring ? ` / ${recurring}` : "";
  const currency = String(price.price_currency ?? "usd").toUpperCase();
  switch (price.amount_type) {
    case "fixed":
      return `${currency} ${((num(price.price_amount) ?? 0) / 100).toFixed(2)}${suffix}`;
    case "custom":
      return `Pay what you want${suffix}`;
    case "free":
      return `Free${suffix}`;
    case "seat_based":
      return `Per seat${suffix}`;
    default:
      return `Price${suffix}`;
  }
}

export function mapPolarProduct(resource: PolarResource, usedSlugs: Set<string>): MappedPolarProduct {
  const name = str(resource.name) || `Product ${resource.id}`;
  const recurringInterval = intervalUnit(resource.recurring_interval);
  const isRecurring = resource.is_recurring === true;
  const archived = resource.is_archived === true;
  const benefits = arr(resource.benefits);
  const notes: PolarNote[] = [];

  // Benefit-derived settings are shared by every price of the product.
  let license: Partial<MappedVariant> = {};
  let github: Partial<MappedVariant> = {};
  let delivery: string | null = null;
  for (const benefit of benefits) {
    const props = (benefit.properties ?? {}) as PolarResource;
    switch (benefit.type) {
      case "license_keys": {
        const activations = props.activations as PolarResource | null | undefined;
        const expires = props.expires as PolarResource | null | undefined;
        const ttl = num(expires?.ttl);
        const unit = expires?.timeframe;
        license = {
          generateLicense: true,
          licenseSeatLimit: activations ? num(activations.limit) ?? null : null,
          licenseType: ttl && ttl > 0 ? "standard" : "perpetual",
          licenseUpdatePeriodUnit: ttl && (unit === "day" || unit === "month" || unit === "year") ? unit : null,
          licenseUpdatePeriodCount: ttl && ttl > 0 ? ttl : null,
        };
        break;
      }
      case "github_repository":
        github = {
          githubRepoOwner: str(props.repository_owner),
          githubRepoName: str(props.repository_name),
        };
        break;
      case "custom": {
        const note = str(props.note);
        if (note) delivery = delivery ? `${delivery}\n\n${note}` : note;
        break;
      }
      case "downloadables":
        notes.push({
          sourceId: resource.id,
          message: `${name}: downloadable files cannot be read through the Polar API. Re-upload them to the variants (files: ${arr(props.files).length}).`,
        });
        break;
      case "discord":
        notes.push({ sourceId: resource.id, message: `${name}: Discord benefit needs manual setup.` });
        break;
      case "meter_credit":
        notes.push({ sourceId: resource.id, message: `${name}: meter credits are not supported; skipped.` });
        break;
      default:
        notes.push({ sourceId: resource.id, message: `${name}: benefit "${String(benefit.type)}" is not supported.` });
    }
  }

  const allPrices = arr(resource.prices);
  const active = allPrices.filter((price) => price.is_archived !== true);
  const prices = (active.length ? active : allPrices).filter((price) => {
    if (price.amount_type === "metered_unit") {
      notes.push({ sourceId: resource.id, message: `${name}: metered price ${price.id} is not supported; skipped.` });
      return false;
    }
    return true;
  });
  const variantSlugs = new Set<string>();
  const trialCount = num(resource.trial_interval_count);
  const trialDays = trialCount ? dayCount(resource.trial_interval, trialCount) : null;

  const variants = prices.map((price, index): MappedVariant => {
    const label = priceLabel(price, isRecurring ? String(resource.recurring_interval) : null);
    const custom = price.amount_type === "custom";
    let amount = 0;
    if (price.amount_type === "fixed") amount = num(price.price_amount) ?? 0;
    else if (custom) amount = num(price.minimum_amount) ?? 0;
    else if (price.amount_type === "seat_based") {
      amount = num(arr(price.seat_tiers?.tiers)[0]?.price_per_seat) ?? 0;
      notes.push({
        sourceId: resource.id,
        message: `${name}: seat-based price imported at the first tier (${amount / 100}); review seat pricing.`,
      });
    }
    return {
      sourceId: String(price.id),
      productSourceId: String(resource.id),
      name: prices.length === 1 ? name : label,
      slug: uniqueSlug(slugify(label, "variant"), variantSlugs),
      description: "",
      sort: index,
      status: archived || price.is_archived === true ? "draft" : "published",
      price: Math.max(0, Math.round(amount)),
      customAmountEnabled: custom ? true : null,
      minPrice: custom ? num(price.minimum_amount) : null,
      suggestedPrice: custom ? num(price.preset_amount) : null,
      billingType: isRecurring ? "subscription" : "one_time",
      intervalUnit: isRecurring ? recurringInterval : null,
      intervalCount: isRecurring ? num(resource.recurring_interval_count) ?? 1 : null,
      trialDays: isRecurring ? trialDays : null,
      generateLicense: license.generateLicense ?? null,
      licenseSeatLimit: license.generateLicense ? license.licenseSeatLimit : undefined,
      licenseType: license.licenseType ?? null,
      licenseUpdatePeriodUnit: license.licenseUpdatePeriodUnit ?? null,
      licenseUpdatePeriodCount: license.licenseUpdatePeriodCount ?? null,
      githubRepoOwner: github.githubRepoOwner ?? null,
      githubRepoName: github.githubRepoName ?? null,
      deliveryContent: delivery,
    };
  });
  if (isRecurring && recurringInterval === null && resource.recurring_interval === "day") {
    notes.push({ sourceId: resource.id, message: `${name}: daily billing is not supported; set the interval manually.` });
  }
  const lowest = variants.length ? Math.min(...variants.map((v) => v.price)) : 0;
  return {
    product: {
      sourceId: String(resource.id),
      name,
      slug: uniqueSlug(slugify(name, "product"), usedSlugs),
      description: str(resource.description) || "",
      price: lowest,
      status: archived ? "draft" : "published",
      imageUrl: str(arr(resource.medias)[0]?.public_url),
      storeSourceId: str(resource.organization_id),
    },
    variants,
    notes,
    benefitIds: benefits.map((benefit) => String(benefit.id)),
  };
}

export function mapPolarCustomer(resource: PolarResource): MappedCustomer | null {
  const email = str(resource.email)?.toLowerCase();
  if (!email) return null;
  return {
    sourceId: String(resource.id),
    email,
    name: str(resource.name) || email,
    createdAt: str(resource.created_at),
    ordersCount: 0,
    totalSpent: 0,
  };
}

export function mapPolarOrder(resource: PolarResource): MappedOrder | null {
  const customer = (resource.customer ?? {}) as PolarResource;
  const email = str(customer.email)?.toLowerCase();
  if (!email) return null;
  const status =
    resource.status === "paid"
      ? "paid"
      : resource.status === "refunded" || resource.status === "partially_refunded"
        ? "refunded"
        : resource.status === "void"
          ? "failed"
          : "pending";
  const items = arr(resource.items);
  const createdAt = str(resource.created_at) || new Date(0).toISOString();
  return {
    sourceId: String(resource.id),
    productSourceId: str(resource.product_id),
    variantSourceId: str(items[0]?.product_price_id),
    productName: str(resource.product?.name) || str(resource.description) || "Imported product",
    variantName: str(items[0]?.label),
    email,
    customerName: str(customer.name),
    currency: (str(resource.currency) || "USD").toUpperCase(),
    amount: Math.max(0, Math.round(num(resource.total_amount) ?? 0)),
    discountAmount: Math.max(0, Math.round(num(resource.discount_amount) ?? 0)),
    status,
    createdAt,
    paidAt: status === "paid" || status === "refunded" ? createdAt : null,
  };
}

export function mapPolarLicense(
  resource: PolarResource,
  benefitProduct: Record<string, string>,
): MappedLicense | null {
  const key = str(resource.key);
  const email = str(resource.customer?.email)?.toLowerCase();
  // A masked key (display_key) cannot be used to validate; refuse to import it.
  if (!key || !email || (str(resource.display_key) === key && key.includes("***"))) return null;
  const limit = num(resource.limit_activations);
  return {
    sourceId: String(resource.id),
    orderSourceId: null,
    productSourceId: benefitProduct[String(resource.benefit_id)] ?? null,
    key,
    email,
    activationLimit: limit && limit > 0 ? limit : null,
    expiresAt: str(resource.expires_at),
    status: resource.status === "granted" ? "active" : "inactive",
    createdAt: str(resource.created_at) || new Date(0).toISOString(),
  };
}

export function mapPolarActivation(resource: PolarResource): MappedLicenseInstance {
  return {
    id: String(resource.id),
    name: str(resource.label) || "",
    createdAt: str(resource.created_at) || new Date(0).toISOString(),
  };
}

export function mapPolarDiscount(resource: PolarResource, productSourceIds: string[]): MappedDiscount | null {
  const code = str(resource.code)?.toUpperCase();
  if (!code) return null;
  const percent = resource.type === "percentage";
  const amount = percent ? (num(resource.basis_points) ?? 0) / 100 : (num(resource.amount) ?? 0) / 100;
  const ends = str(resource.ends_at);
  return {
    sourceId: String(resource.id),
    code,
    type: percent ? "percentage" : "fixed",
    value: amount,
    usageLimit: num(resource.max_redemptions) ?? 0,
    usageCount: num(resource.redemptions_count) ?? 0,
    startsAt: str(resource.starts_at),
    expiresAt: ends,
    limitedToProducts: productSourceIds.length > 0,
    productSourceIds,
    active: !ends || Date.parse(ends) > Date.now(),
    createdAt: str(resource.created_at),
  };
}

const billingStatuses = new Set(["trialing", "active", "past_due", "unpaid"]);

export function mapPolarSubscription(resource: PolarResource): MappedSubscription | null {
  const customer = (resource.customer ?? {}) as PolarResource;
  const email = str(customer.email)?.toLowerCase();
  if (!email) return null;
  const status = String(resource.status);
  const willEnd = resource.cancel_at_period_end === true || Boolean(resource.ends_at);
  return {
    sourceId: String(resource.id),
    productSourceId: str(resource.product_id),
    variantSourceId: str(arr(resource.prices)[0]?.id),
    orderSourceId: null,
    productName: str(resource.product?.name) || "Imported product",
    variantName: null,
    email,
    name: str(customer.name),
    lsStatus: status,
    paymentProcessor: "stripe",
    cardBrand: null,
    cardLast4: null,
    renewsAt: str(resource.current_period_end),
    endsAt: str(resource.ends_at),
    trialEndsAt: str(resource.trial_end),
    billingAnchor: null,
    createdAt: str(resource.started_at) || str(resource.created_at),
    billing: billingStatuses.has(status) && !willEnd,
    sourceCustomerId: str(resource.customer_id),
    sourcePaymentMethodId: null,
    migrationState: "waiting_for_cards",
  };
}
