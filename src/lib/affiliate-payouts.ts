import "server-only";

import {
  listFeatureRecords,
  updateFeatureRecord,
} from "./feature-records";
import type { PayPalMode } from "./types";

export async function settleAffiliateReferrals(input: {
  userId: string;
  affiliateName: string;
  payoutId: string;
  amount: number;
  environment?: PayPalMode;
}): Promise<void> {
  const referrals = (await listFeatureRecords(
    input.userId,
    "affiliate-referrals",
    input.environment
  )).filter(
    (referral) =>
      referral.title === input.affiliateName &&
      referral.status === "approved"
  );
  let remaining = input.amount;

  for (const referral of referrals) {
    const commission = Number(referral.data.commission || 0);
    if (commission <= 0 || commission > remaining) continue;
    remaining -= commission;
    await updateFeatureRecord(referral.id, input.userId, {
      status: "paid",
      data: {
        ...referral.data,
        payoutId: input.payoutId,
        paidAt: new Date().toISOString(),
      },
    });
  }
}

export async function settleAffiliatePayoutReport(input: {
  userId: string;
  payoutId: string;
  environment?: PayPalMode;
}): Promise<void> {
  const referrals = (await listFeatureRecords(
    input.userId,
    "affiliate-referrals",
    input.environment
  )).filter(
    (referral) =>
      referral.data.payoutReportId === input.payoutId &&
      referral.status !== "paid" &&
      referral.status !== "rejected"
  );
  const paidAt = new Date().toISOString();
  for (const referral of referrals) {
    await updateFeatureRecord(referral.id, input.userId, {
      status: "paid",
      data: {
        ...referral.data,
        payoutId: input.payoutId,
        paidAt,
      },
    });
  }
}
