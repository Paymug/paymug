import type { AffiliateCommissionType } from "./types";

export function calculateAffiliateCommission(
  orderAmountCents: number,
  commissionType: AffiliateCommissionType,
  commissionValue: number
): number {
  const orderAmount = Math.max(0, orderAmountCents) / 100;
  const normalizedValue = Math.max(0, commissionValue);
  const commission =
    commissionType === "fixed"
      ? Math.min(orderAmount, normalizedValue)
      : orderAmount * Math.min(normalizedValue, 100) / 100;
  return Math.round(commission * 100) / 100;
}

export function affiliateCookieMatchesStore(
  cookieOwner: string | undefined,
  userId: string,
  storeId: string
): boolean {
  return cookieOwner === storeId || cookieOwner === userId;
}
