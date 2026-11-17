import {
  slugify,
  uniqueSlug,
  type MappedCustomer,
  type MappedDiscount,
  type MappedOrder,
  type MappedProduct,
  type MappedSubscription,
  type MappedVariant,
} from "../../lemonsqueezy/mappers";
import type { PaddleResource } from "./client";

export const paddleSource = "paddle";

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const arr = (v: unknown): PaddleResource[] => (Array.isArray(v) ? (v as PaddleResource[]) : []);

/** Paddle money is a string of minor units ("1999"). */
export function minor(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : 0;
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

const unitOf = (v: unknown): "week" | "month" | "year" | null =>
  v === "week" || v === "month" || v === "year" ? v : null;

export function mapPaddleProduct(resource: PaddleResource, usedSlugs: Set<string>): MappedProduct {
  const name = str(resource.name) || `Product ${resource.id}`;
  return {
    sourceId: String(resource.id),
    name,
    slug: uniqueSlug(slugify(name, "product"), usedSlugs),
    description: str(resource.description) || "",
    price: 0,
    status: resource.status === "active" ? "published" : "draft",
    imageUrl: str(resource.image_url),
    storeSourceId: null,
  };
}

export interface MappedPaddlePrice {
  variant: MappedVariant;
  currency: string;
  /** Extra country-specific overrides, reported but not imported. */
  overrideCount: number;
}

export function mapPaddlePrice(resource: PaddleResource, usedSlugs: Set<string>, sort: number): MappedPaddlePrice {
  const cycle = resource.billing_cycle as PaddleResource | null | undefined;
  const trial = resource.trial_period as PaddleResource | null | undefined;
  const label = str(resource.name) || str(resource.description) || `Price ${resource.id}`;
  let trialDays: number | null = null;
  if (trial && typeof trial.frequency === "number") {
    const mult = trial.interval === "year" ? 365 : trial.interval === "month" ? 30 : trial.interval === "week" ? 7 : 1;
    trialDays = trial.frequency * mult;
  }
  return {
    currency: String(resource.unit_price?.currency_code ?? "USD").toUpperCase(),
    overrideCount: arr(resource.unit_price_overrides).length,
    variant: {
      sourceId: String(resource.id),
      productSourceId: String(resource.product_id),
      name: label,
      slug: uniqueSlug(slugify(label, "variant"), usedSlugs),
      description: str(resource.description) || "",
      sort,
      status: resource.status === "archived" ? "draft" : "published",
      price: minor(resource.unit_price?.amount),
      customAmountEnabled: null,
      minPrice: null,
      suggestedPrice: null,
      billingType: cycle ? "subscription" : "one_time",
      intervalUnit: cycle ? unitOf(cycle.interval) : null,
      intervalCount: cycle ? (typeof cycle.frequency === "number" ? cycle.frequency : 1) : null,
      trialDays,
      generateLicense: null,
      licenseSeatLimit: undefined,
      licenseType: null,
      licenseUpdatePeriodUnit: null,
      licenseUpdatePeriodCount: null,
    },
  };
}

export function mapPaddleCustomer(resource: PaddleResource): MappedCustomer | null {
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

/** One order per transaction line item (id `txn` for one item, `txn:n` for more). */
export function mapPaddleTransaction(
  resource: PaddleResource,
  customer: PaddleResource | undefined,
): MappedOrder[] {
  const email = str(customer?.email)?.toLowerCase();
  if (!email || (resource.status !== "completed" && resource.status !== "billed")) return [];
  const lines = arr(resource.details?.line_items);
  const fallback = arr(resource.items).map((item) => ({
    price_id: item.price?.id ?? item.price_id,
    product_id: item.price?.product_id ?? item.product?.id,
    totals: undefined as PaddleResource | undefined,
    product: item.product,
  }));
  const items = lines.length ? lines : fallback;
  const totals = resource.details?.totals as PaddleResource | undefined;
  const createdAt = str(resource.created_at) || new Date(0).toISOString();
  const paidAt = str(resource.billed_at) || createdAt;
  const currency = String(resource.currency_code ?? totals?.currency_code ?? "USD").toUpperCase();
  const list = items.length ? items : [{ price_id: null, product_id: null, totals, product: undefined }];
  return list.map((item, index) => {
    const t = (item.totals ?? totals) as PaddleResource | undefined;
    return {
      sourceId: list.length === 1 ? String(resource.id) : `${resource.id}:${index}`,
      productSourceId: str(item.product_id),
      variantSourceId: str(item.price_id),
      productName: str(item.product?.name) || "Imported product",
      variantName: null,
      email,
      customerName: str(customer?.name),
      currency,
      amount: minor(t?.total),
      discountAmount: minor(t?.discount),
      status: "paid",
      createdAt,
      paidAt,
    };
  });
}

export function mapPaddleDiscount(resource: PaddleResource, scopedPriceIds: string[]): MappedDiscount | null {
  const code = str(resource.code)?.toUpperCase();
  if (!code) return null;
  const percent = resource.type === "percentage";
  const amount = Number(resource.amount);
  const safe = Number.isFinite(amount) ? amount : 0;
  const expires = str(resource.expires_at);
  const status = String(resource.status);
  return {
    sourceId: String(resource.id),
    code,
    type: percent ? "percentage" : "fixed",
    value: percent ? safe : safe / 100,
    usageLimit: typeof resource.usage_limit === "number" ? resource.usage_limit : 0,
    usageCount: typeof resource.times_used === "number" ? resource.times_used : 0,
    startsAt: null,
    expiresAt: expires,
    limitedToProducts: scopedPriceIds.length > 0,
    productSourceIds: scopedPriceIds,
    active: status === "active" && (!expires || Date.parse(expires) > Date.now()),
    createdAt: str(resource.created_at),
  };
}

const billingStatuses = new Set(["active", "trialing", "past_due", "paused"]);

export function mapPaddleSubscription(
  resource: PaddleResource,
  customer: PaddleResource | undefined,
  method: PaddleResource | null,
): MappedSubscription | null {
  const email = str(customer?.email)?.toLowerCase();
  if (!email) return null;
  const item = arr(resource.items)[0] ?? {};
  const status = String(resource.status);
  const cancelScheduled = resource.scheduled_change?.action === "cancel";
  const manual = resource.collection_mode === "manual";
  const card = (method?.card ?? {}) as PaddleResource;
  return {
    sourceId: String(resource.id),
    productSourceId: str(item.price?.product_id ?? item.product?.id),
    variantSourceId: str(item.price?.id),
    orderSourceId: null,
    productName: str(item.product?.name) || "Imported product",
    variantName: null,
    email,
    name: str(customer?.name),
    lsStatus: status,
    paymentProcessor: manual ? "unknown" : "stripe",
    cardBrand: str(card.type),
    cardLast4: str(card.last4),
    renewsAt: str(resource.next_billed_at),
    endsAt: str(resource.scheduled_change?.effective_at),
    trialEndsAt: null,
    billingAnchor: null,
    createdAt: str(resource.started_at) || str(resource.created_at),
    billing: billingStatuses.has(status) && !cancelScheduled,
    sourceCustomerId: str(resource.customer_id),
    sourcePaymentMethodId: str(method?.id),
    migrationState: manual ? "needs_resubscribe" : "waiting_for_cards",
  };
}
