/**
 * Pure planning for moving imported Lemon Squeezy card subscriptions onto
 * Stripe subscriptions in the seller's own account, once Lemon Squeezy has
 * copied the cards there. Nothing here calls Stripe or the database.
 */

export interface PendingSubscription {
  recordId: string;
  email: string;
  productName: string;
  variantName: string | null;
  /** ISO date Lemon Squeezy would next charge. */
  renewsAt: string | null;
  cardLast4: string | null;
  /** Resolved from the imported variant; null when it cannot be priced. */
  price: {
    amountCents: number;
    currency: string;
    interval: "week" | "month" | "year";
    intervalCount: number;
  } | null;
}

export interface StripeCardCustomer {
  customerId: string;
  paymentMethodId: string | null;
  last4: string | null;
}

export type LinkAction = "create" | "waiting" | "manual_review";

export interface LinkPlanItem {
  recordId: string;
  email: string;
  productName: string;
  variantName: string | null;
  action: LinkAction;
  reason: string;
  customerId?: string;
  paymentMethodId?: string;
  /** Unix seconds: first charge happens here, so nobody is charged twice. */
  firstChargeAt?: number;
  amountCents?: number;
  currency?: string;
}

export function planStripeLinks(
  subscriptions: PendingSubscription[],
  customersByEmail: Map<string, StripeCardCustomer[]>,
  nowMs: number,
  options: {
    /** Exact Stripe ids from an uploaded mapping file, keyed by record id. */
    mapped?: Map<string, StripeCardCustomer>;
    sourceLabel?: string;
  } = {},
): LinkPlanItem[] {
  const sourceLabel = options.sourceLabel ?? "Lemon Squeezy";
  return subscriptions.map((subscription): LinkPlanItem => {
    const base = {
      recordId: subscription.recordId,
      email: subscription.email,
      productName: subscription.productName,
      variantName: subscription.variantName,
    };
    const exact = options.mapped?.get(subscription.recordId);
    const withCards = exact
      ? [exact].filter((customer) => customer.paymentMethodId)
      : (customersByEmail.get(subscription.email.toLowerCase()) ?? []).filter(
          (customer) => customer.paymentMethodId,
        );
    if (withCards.length === 0) {
      return { ...base, action: "waiting", reason: "No card in Stripe for this email yet" };
    }
    if (withCards.length > 1) {
      return {
        ...base,
        action: "manual_review",
        reason: `${withCards.length} Stripe customers with cards share this email`,
      };
    }
    const [customer] = withCards;
    if (!subscription.price) {
      return { ...base, action: "manual_review", reason: "Variant has no billing interval or price" };
    }
    if (
      subscription.cardLast4 &&
      customer.last4 &&
      subscription.cardLast4 !== customer.last4
    ) {
      return {
        ...base,
        action: "manual_review",
        reason: `Card ends ${customer.last4} in Stripe but ${subscription.cardLast4} in ${sourceLabel}`,
      };
    }
    const renews = subscription.renewsAt ? Date.parse(subscription.renewsAt) : Number.NaN;
    if (!Number.isFinite(renews) || renews <= nowMs) {
      return {
        ...base,
        action: "manual_review",
        reason: `Renewal date is missing or already passed; check ${sourceLabel} before billing`,
      };
    }
    return {
      ...base,
      action: "create",
      reason: "Ready",
      customerId: customer.customerId,
      paymentMethodId: customer.paymentMethodId as string,
      firstChargeAt: Math.floor(renews / 1000),
      amountCents: subscription.price.amountCents,
      currency: subscription.price.currency,
    };
  });
}

export function summarizePlan(items: LinkPlanItem[]) {
  return {
    create: items.filter((item) => item.action === "create").length,
    waiting: items.filter((item) => item.action === "waiting").length,
    manualReview: items.filter((item) => item.action === "manual_review").length,
    plannedAmountCents: items
      .filter((item) => item.action === "create")
      .reduce((sum, item) => sum + (item.amountCents ?? 0), 0),
  };
}
