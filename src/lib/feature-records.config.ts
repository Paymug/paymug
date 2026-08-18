import type { DashboardFeatureKey } from "./feature-records.types";

export const dashboardFeatureKeys: DashboardFeatureKey[] = [
  "subscriptions",
  "customers",
  "discounts",
  "licenses",
  "campaigns",
  "subscribers",
  "affiliates",
  "affiliate-clicks",
  "affiliate-referrals",
  "affiliate-payouts",
  "pages",
];

export function isDashboardFeatureKey(
  value: string
): value is DashboardFeatureKey {
  return dashboardFeatureKeys.includes(value as DashboardFeatureKey);
}
