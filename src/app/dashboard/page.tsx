import Link from "next/link";
import { cookies } from "next/headers";
import {
  dashboardButtonBaseClass,
  dashboardPageClass,
} from "@/components/dashboard/dashboard.styles";
import { getSessionUser } from "@/lib/auth";
import {
  getEarliestOrderDate,
  listOrderMetricsByUser,
  listProductSummariesByUser,
} from "@/lib/db";
import {
  getEarliestFeatureActivityDate,
  listFeatureRecords,
  listFeatureRecordsInRange,
} from "@/lib/feature-records";
import { getPayPalCredentials, getStripeCredentials } from "@/lib/payment-credentials";
import { DashboardOverview } from "./DashboardOverview";
import {
  dashboardFilterCookieName,
  parseDashboardFilterCookie,
  parseDashboardFilterState,
} from "./dashboard-filter.utils";
import {
  buildDashboardOverview,
} from "./dashboard-overview.utils";
import type { DashboardPageProps } from "./dashboard.types";
import { getStoreById } from "@/lib/stores";
import {
  getUtcQueryRange,
  shiftToWallClock,
  toWallClockIso,
} from "@/lib/timezone";
import { getPreviousAnalyticsRange } from "@/lib/visitor-analytics.utils";

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const user = await getSessionUser();
  if (!user) return null;

  const params = await searchParams;
  const cookieJar = await cookies();
  const timeZone = user.timezone;
  const savedFilter = parseDashboardFilterCookie(
    cookieJar.get(dashboardFilterCookieName)?.value,
    timeZone,
  );
  const filter = parseDashboardFilterState(params, savedFilter, timeZone);
  // Range-only sources are fetched for the previous + current window, padded
  // a day on each side so wall-clock shifting never drops a boundary record.
  // Orders, subscriptions and subscribers stay full-history: returning
  // customers, MRR, churn and subscriber counts are point-in-time metrics.
  const previousRange = getPreviousAnalyticsRange(
    filter.startDate,
    filter.endDate,
  );
  const queryRange = getUtcQueryRange(previousRange.startDate, filter.endDate);
  const env = user.environment;
  const [
    rawOrders,
    products,
    rawSubscriptions,
    rawSubscribers,
    rawCampaigns,
    rawAffiliateClicks,
    rawAffiliateReferrals,
    rawAffiliatePayouts,
    earliestOrderDate,
    earliestFeatureDate,
    paypal,
    stripe,
    store,
  ] =
    await Promise.all([
      listOrderMetricsByUser(user.id, user.activeStoreId, env),
      listProductSummariesByUser(user.id, user.activeStoreId, env),
      listFeatureRecords(user.id, "subscriptions", env),
      listFeatureRecords(user.id, "subscribers", env),
      listFeatureRecordsInRange(
        user.id,
        "campaigns",
        env,
        queryRange.startDate,
        queryRange.endDate,
      ),
      listFeatureRecordsInRange(
        user.id,
        "affiliate-clicks",
        env,
        queryRange.startDate,
        queryRange.endDate,
      ),
      listFeatureRecordsInRange(
        user.id,
        "affiliate-referrals",
        env,
        queryRange.startDate,
        queryRange.endDate,
      ),
      listFeatureRecordsInRange(
        user.id,
        "affiliate-payouts",
        env,
        queryRange.startDate,
        queryRange.endDate,
      ),
      getEarliestOrderDate(user.id, user.activeStoreId, env),
      getEarliestFeatureActivityDate(
        user.id,
        ["campaigns", "affiliate-clicks", "affiliate-referrals", "affiliate-payouts"],
        env,
      ),
      getPayPalCredentials(user.id, undefined, user.activeStoreId),
      getStripeCredentials(user.id, undefined, user.activeStoreId),
      getStoreById(user.activeStoreId, user.id),
    ]);
  // Bucket everything by the user's local day and hour.
  const orders = shiftToWallClock(rawOrders, timeZone);
  const subscriptions = shiftToWallClock(rawSubscriptions, timeZone);
  const subscribers = shiftToWallClock(rawSubscribers, timeZone);
  const campaigns = shiftToWallClock(rawCampaigns, timeZone);
  const affiliateClicks = shiftToWallClock(rawAffiliateClicks, timeZone);
  const affiliateReferrals = shiftToWallClock(rawAffiliateReferrals, timeZone);
  const affiliatePayouts = shiftToWallClock(rawAffiliatePayouts, timeZone);
  const selectedProductId =
    filter.productId === "all" ||
    products.some((product) => product.id === filter.productId)
      ? filter.productId
      : "all";
  const overview = buildDashboardOverview({
    orders,
    subscriptions,
    subscribers,
    campaigns,
    affiliateClicks,
    affiliateReferrals,
    affiliatePayouts,
    startDate: filter.startDate,
    endDate: filter.endDate,
    interval: filter.interval,
    productId: selectedProductId,
  });
  const earliestDate = [
    ...[earliestOrderDate, earliestFeatureDate].flatMap((date) =>
      date ? [toWallClockIso(date, timeZone)] : []
    ),
    ...subscriptions.map((subscription) => subscription.createdAt),
    ...subscribers.map((subscriber) => subscriber.createdAt),
  ]
    .map((date) => date.slice(0, 10))
    .sort()[0];

  return (
    <div className={dashboardPageClass}>
      <DashboardOverview
        startDate={filter.startDate}
        endDate={filter.endDate}
        interval={filter.interval}
        productId={selectedProductId}
        rangeMode={filter.rangeMode}
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
        }))}
        earliestDate={earliestDate}
        metricGroups={overview.metricGroups}
        defaultMetricKey={overview.primary.key}
        currency={overview.currency}
      >
        {!(store?.paymentGateway === "stripe" ? stripe : paypal) && (
          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-[#f2d991] bg-[#fffaf0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Connect a payment gateway to accept payments
              </p>
              <p className="mt-1 text-sm text-muted">
                Buyers pay your account directly — Paymug never holds funds.
              </p>
            </div>
            <Link
              href="/dashboard/settings/payments"
              className={`${dashboardButtonBaseClass} bg-[#27272f] text-white hover:bg-[#3a3a45]`}
            >
              Connect payments
            </Link>
          </div>
        )}
      </DashboardOverview>
    </div>
  );
}
