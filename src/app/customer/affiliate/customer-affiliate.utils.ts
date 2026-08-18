import { calculateAffiliateCommission } from "@/lib/affiliate-settings.utils";

export function calculateCustomerAffiliateEstimate(
  priceCents: number,
  referrals: number,
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
  const annualPayments = commissionDuration === "recurring" ? 12 : 1;
  return commissionCents * Math.max(0, referrals) * annualPayments;
}

export function getCustomerAffiliateCommissionLabel(
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
