import type {
  Product,
  ProductBillingType,
  ProductIntervalUnit,
} from "./types";
import { MAX_SUBSCRIPTION_TRIAL_DAYS } from "./subscription-trial.utils";

export const PRODUCT_INTERVAL_UNITS: ProductIntervalUnit[] = [
  "week",
  "month",
  "year",
];

const maxIntervalCount: Record<ProductIntervalUnit, number> = {
  week: 52,
  month: 12,
  year: 1,
};

export function parseProductBillingType(value: unknown): ProductBillingType {
  return value === "subscription" ? "subscription" : "one_time";
}

export function parseProductIntervalUnit(
  value: unknown
): ProductIntervalUnit | null {
  if (value === "week" || value === "month" || value === "year") return value;
  return null;
}

export function parseProductIntervalCount(
  value: unknown,
  unit: ProductIntervalUnit | null | undefined
): number {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("Billing interval count must be a whole number of at least 1");
  }
  if (unit) {
    const max = maxIntervalCount[unit];
    if (count > max) {
      throw new Error(
        unit === "year"
          ? "Yearly billing supports a count of 1 only"
          : `Billing interval count cannot exceed ${max} ${unit}s`
      );
    }
  }
  return count;
}

export function parseProductTrialDays(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const days = Number(value);
  if (
    !Number.isInteger(days) ||
    days < 0 ||
    days > MAX_SUBSCRIPTION_TRIAL_DAYS
  ) {
    throw new Error(
      `Free trial must be a whole number from 0 to ${MAX_SUBSCRIPTION_TRIAL_DAYS} days`
    );
  }
  return days;
}

export function isSubscriptionProduct(
  product: Pick<Product, "billingType">
): boolean {
  return product.billingType === "subscription";
}

export function getProductBillingCadence(
  product: Pick<Product, "billingType" | "intervalUnit" | "intervalCount">
): {
  unit: ProductIntervalUnit;
  count: number;
} | null {
  if (product.billingType !== "subscription") return null;
  const unit = product.intervalUnit || "month";
  const count = Math.max(1, product.intervalCount || 1);
  return { unit, count };
}

export function formatProductIntervalLabel(
  unit: ProductIntervalUnit,
  count: number
): string {
  const labels: Record<ProductIntervalUnit, [string, string]> = {
    week: ["week", "weeks"],
    month: ["month", "months"],
    year: ["year", "years"],
  };
  const [singular, plural] = labels[unit];
  if (count === 1) return singular;
  return `${count} ${plural}`;
}

export function formatProductPriceSuffix(
  product: Pick<
    Product,
    "billingType" | "intervalUnit" | "intervalCount" | "trialDays"
  >
): string {
  const cadence = getProductBillingCadence(product);
  if (!cadence) return "";
  return ` / ${formatProductIntervalLabel(cadence.unit, cadence.count)}`;
}

export function formatProductBillingSummary(
  product: Pick<
    Product,
    "billingType" | "intervalUnit" | "intervalCount" | "trialDays"
  >
): string | null {
  const cadence = getProductBillingCadence(product);
  if (!cadence) return null;
  const period = formatProductIntervalLabel(cadence.unit, cadence.count);
  const trial =
    product.trialDays > 0
      ? ` · ${product.trialDays}-day free trial`
      : "";
  return `Billed every ${period}${trial}`;
}

/** PayPal Catalog billing frequency. */
export function toPayPalIntervalUnit(
  unit: ProductIntervalUnit
): "WEEK" | "MONTH" | "YEAR" {
  if (unit === "week") return "WEEK";
  if (unit === "year") return "YEAR";
  return "MONTH";
}

/** Stripe Checkout recurring interval. */
export function toStripeIntervalUnit(
  unit: ProductIntervalUnit
): "week" | "month" | "year" {
  return unit;
}

/** Normalize legacy dashboard subscription interval values. */
export function normalizeLegacySubscriptionInterval(
  value: unknown
): { unit: ProductIntervalUnit; count: number } {
  if (value === "yearly" || value === "year") {
    return { unit: "year", count: 1 };
  }
  if (value === "weekly" || value === "week") {
    return { unit: "week", count: 1 };
  }
  if (typeof value === "string" && value.includes(":")) {
    const [unitRaw, countRaw] = value.split(":");
    const unit = parseProductIntervalUnit(unitRaw) || "month";
    const count = Number(countRaw);
    return {
      unit,
      count: Number.isInteger(count) && count > 0 ? count : 1,
    };
  }
  return { unit: "month", count: 1 };
}
