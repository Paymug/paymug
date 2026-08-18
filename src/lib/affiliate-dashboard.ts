import "server-only";

import { listFeatureRecords } from "./feature-records";
import type { FeatureRecord } from "./feature-records.types";
import type { PayPalMode } from "./types";

export async function listAffiliateDashboardRecords(
  userId: string,
  storeId: string,
  environment?: PayPalMode,
): Promise<FeatureRecord[]> {
  const [affiliates, clicks, referrals, payouts] = await Promise.all([
    listFeatureRecords(userId, "affiliates", environment),
    listFeatureRecords(userId, "affiliate-clicks", environment),
    listFeatureRecords(userId, "affiliate-referrals", environment),
    listFeatureRecords(userId, "affiliate-payouts", environment),
  ]);
  return affiliates
    .filter(
      (affiliate) =>
        !affiliate.data.storeId || affiliate.data.storeId === storeId,
    )
    .map((affiliate) => {
      const affiliateClicks = clicks.filter(
        (click) =>
          click.data.affiliateId === affiliate.id &&
          (!click.data.storeId || click.data.storeId === storeId),
      );
      const affiliateReferrals = referrals.filter(
        (referral) =>
          referral.data.affiliateId === affiliate.id &&
          (!referral.data.storeId || referral.data.storeId === storeId),
      );
      const affiliatePayouts = payouts.filter(
        (payout) =>
          (payout.data.affiliateId === affiliate.id ||
            (!payout.data.affiliateId && payout.title === affiliate.title)) &&
          (!payout.data.storeId || payout.data.storeId === storeId),
      );
      const payableReferrals = affiliateReferrals.filter(
        (referral) => referral.status !== "rejected",
      );
      const unpaidReferrals = payableReferrals.filter(
        (referral) => referral.status !== "paid",
      );
      const computedTotalEarnings = payableReferrals.reduce(
        (total, referral) => total + Number(referral.data.commission || 0),
        0,
      );
      const computedUnpaidEarnings = unpaidReferrals.reduce(
        (total, referral) => total + Number(referral.data.commission || 0),
        0,
      );
      return {
        ...affiliate,
        data: {
          ...affiliate.data,
          clicksCount: affiliateClicks.length,
          referralsCount: affiliateReferrals.length,
          totalEarnings:
            affiliateReferrals.length > 0
              ? Math.round(computedTotalEarnings * 100) / 100
              : Number(affiliate.data.totalEarnings || 0),
          unpaidEarnings:
            affiliateReferrals.length > 0
              ? Math.round(computedUnpaidEarnings * 100) / 100
              : Number(affiliate.data.unpaidEarnings || 0),
          payoutsCount: affiliatePayouts.length,
        },
      };
    });
}
