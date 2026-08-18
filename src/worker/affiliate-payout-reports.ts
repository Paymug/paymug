import type {
  AffiliatePayoutReportGenerationResult,
  WorkerEnabledStoreRow,
  WorkerFeatureData,
  WorkerFeatureRecordRow,
} from "./affiliate-payout-reports.types";
import { workerHasProFeature } from "./app-license";

const BIWEEKLY_PERIOD_MS = 14 * 24 * 60 * 60 * 1000;
const BIWEEKLY_ANCHOR_MS = Date.UTC(1970, 0, 5);

function parseFeatureData(value: string): WorkerFeatureData {
  try {
    return JSON.parse(value) as WorkerFeatureData;
  } catch {
    return {};
  }
}

function getBiweeklyPeriod(now: Date) {
  const periodIndex = Math.floor(
    (now.getTime() - BIWEEKLY_ANCHOR_MS) / BIWEEKLY_PERIOD_MS,
  );
  const start = new Date(
    BIWEEKLY_ANCHOR_MS + periodIndex * BIWEEKLY_PERIOD_MS,
  );
  const end = new Date(start.getTime() + BIWEEKLY_PERIOD_MS - 1);
  return {
    key: start.toISOString().slice(0, 10),
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export async function generateBiweeklyAffiliatePayoutReports(
  database: D1Database,
  now = new Date(),
): Promise<AffiliatePayoutReportGenerationResult> {
  if (!(await workerHasProFeature(database, "affiliates", now))) {
    return { reportsCreated: 0, referralsIncluded: 0 };
  }
  const [affiliateResult, referralResult, payoutResult, storeResult] =
    await Promise.all([
      database
        .prepare(
          "SELECT id, user_id, title, subtitle, status, data FROM feature_records WHERE feature = 'affiliates'",
        )
        .all<WorkerFeatureRecordRow>(),
      database
        .prepare(
          "SELECT id, user_id, title, subtitle, status, data FROM feature_records WHERE feature = 'affiliate-referrals'",
        )
        .all<WorkerFeatureRecordRow>(),
      database
        .prepare(
          "SELECT id, user_id, title, subtitle, status, data FROM feature_records WHERE feature = 'affiliate-payouts'",
        )
        .all<WorkerFeatureRecordRow>(),
      database
        .prepare(
          "SELECT id, user_id FROM stores WHERE affiliates_enabled = 1",
        )
        .all<WorkerEnabledStoreRow>(),
    ]);
  const affiliates = affiliateResult.results || [];
  const referrals = referralResult.results || [];
  const payouts = payoutResult.results || [];
  const enabledStores = storeResult.results || [];
  const enabledStoreIds = new Set(enabledStores.map((store) => store.id));
  const usersWithEnabledStores = new Set(
    enabledStores.map((store) => store.user_id),
  );
  const period = getBiweeklyPeriod(now);
  const generatedAt = now.toISOString();
  let reportsCreated = 0;
  let referralsIncluded = 0;

  for (const affiliate of affiliates) {
    const affiliateData = parseFeatureData(affiliate.data);
    const affiliateStoreId = String(affiliateData.storeId || "");
    if (
      (affiliateStoreId && !enabledStoreIds.has(affiliateStoreId)) ||
      (!affiliateStoreId && !usersWithEnabledStores.has(affiliate.user_id))
    ) {
      continue;
    }
    const alreadyGenerated = payouts.some((payout) => {
      const payoutData = parseFeatureData(payout.data);
      return (
        payout.user_id === affiliate.user_id &&
        payoutData.affiliateId === affiliate.id &&
        payoutData.periodKey === period.key
      );
    });
    if (alreadyGenerated) continue;

    const unpaidReferrals = referrals.filter((referral) => {
      if (referral.user_id !== affiliate.user_id) return false;
      if (referral.status !== "pending" && referral.status !== "approved") {
        return false;
      }
      const referralData = parseFeatureData(referral.data);
      const referralStoreId = String(
        referralData.storeId || affiliateStoreId,
      );
      return (
        referralData.affiliateId === affiliate.id &&
        (!referralStoreId || enabledStoreIds.has(referralStoreId)) &&
        !referralData.payoutReportId
      );
    });
    const amount = unpaidReferrals.reduce(
      (total, referral) =>
        total + Number(parseFeatureData(referral.data).commission || 0),
      0,
    );
    if (amount <= 0) continue;

    const payoutId = `payout-${period.key}-${affiliate.id}`;
    const payoutData: WorkerFeatureData = {
      affiliateId: affiliate.id,
      storeId: String(affiliateData.storeId || ""),
      recipientEmail: affiliate.subtitle || "",
      amount: Math.round(amount * 100) / 100,
      referralCount: unpaidReferrals.length,
      periodKey: period.key,
      periodStart: period.start,
      periodEnd: period.end,
      generatedAt,
      payoutType: "biweekly_report",
    };
    const statements = [
      database
        .prepare(
          "INSERT OR IGNORE INTO feature_records (id, user_id, feature, title, subtitle, status, data, created_at, updated_at) VALUES (?, ?, 'affiliate-payouts', ?, ?, 'unpaid', ?, ?, ?)",
        )
        .bind(
          payoutId,
          affiliate.user_id,
          affiliate.title,
          `Biweekly report ${period.key}`,
          JSON.stringify(payoutData),
          generatedAt,
          generatedAt,
        ),
      ...unpaidReferrals.map((referral) => {
        const referralData = parseFeatureData(referral.data);
        return database
          .prepare(
            "UPDATE feature_records SET data = ?, updated_at = ? WHERE id = ?",
          )
          .bind(
            JSON.stringify({ ...referralData, payoutReportId: payoutId }),
            generatedAt,
            referral.id,
          );
      }),
    ];
    await database.batch(statements);
    reportsCreated += 1;
    referralsIncluded += unpaidReferrals.length;
  }

  return { reportsCreated, referralsIncluded };
}
