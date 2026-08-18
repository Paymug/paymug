import type { Store } from "@/lib/types";
import { calculateAffiliateCommission } from "@/lib/affiliate-settings.utils";
import type { AffiliateEarningCadence } from "./page.types";

export function getAffiliateCommissionSummary(store: Store): string {
  const commission =
    store.affiliateCommissionType === "percentage"
      ? `${store.affiliateCommissionValue}% commission`
      : `a fixed ${store.affiliateCommissionValue} commission in the order currency`;
  const duration =
    store.affiliateCommissionDuration === "recurring"
      ? "on every attributed purchase"
      : "on the first attributed purchase";
  return `Earn ${commission} ${duration}.`;
}

export function getAffiliateAttributionSummary(store: Store): string {
  return store.affiliateAttributionModel === "last_click"
    ? "The most recent affiliate link visited before checkout receives credit."
    : "The first affiliate link visited before checkout receives credit.";
}

export function calculateAnnualAffiliateValue(
  priceCents: number,
  cadence: AffiliateEarningCadence,
  commissionType: "percentage" | "fixed",
  commissionValue: number,
  commissionDuration: "one_time" | "recurring",
): number {
  const commissionCents = Math.round(
    calculateAffiliateCommission(
      Math.max(0, priceCents),
      commissionType,
      commissionValue,
    ) * 100,
  );
  const paymentsPerYear =
    commissionDuration === "recurring" && cadence === "monthly" ? 12 : 1;
  return commissionCents * paymentsPerYear;
}

export function getAffiliateCommissionLabel(
  commissionType: "percentage" | "fixed",
  commissionValue: number,
  currency: string,
): string {
  if (commissionType === "percentage") return `${commissionValue}%`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(commissionValue);
}
