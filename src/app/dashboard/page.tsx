import Link from "next/link";
import { cookies } from "next/headers";
import {
  dashboardButtonBaseClass,
  dashboardPageClass,
} from "@/components/dashboard/dashboard.styles";
import { getSessionUser } from "@/lib/auth";
import {
  listOrdersByUser,
  listProductsByUser,
} from "@/lib/db";
import { listFeatureRecords } from "@/lib/feature-records";
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

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const user = await getSessionUser();
  if (!user) return null;

  const params = await searchParams;
  const cookieJar = await cookies();
  const savedFilter = parseDashboardFilterCookie(
    cookieJar.get(dashboardFilterCookieName)?.value
  );
  const filter = parseDashboardFilterState(params, savedFilter);
  const [
    orders,
    products,
    subscriptions,
    subscribers,
    campaigns,
    affiliateClicks,
    affiliateReferrals,
    affiliatePayouts,
    paypal,
    stripe,
    store,
  ] =
    await Promise.all([
      listOrdersByUser(user.id, user.activeStoreId, user.environment),
      listProductsByUser(user.id, user.activeStoreId, user.environment),
      listFeatureRecords(user.id, "subscriptions", user.environment),
      listFeatureRecords(user.id, "subscribers", user.environment),
      listFeatureRecords(user.id, "campaigns", user.environment),
      listFeatureRecords(user.id, "affiliate-clicks", user.environment),
      listFeatureRecords(user.id, "affiliate-referrals", user.environment),
      listFeatureRecords(user.id, "affiliate-payouts", user.environment),
      getPayPalCredentials(user.id, undefined, user.activeStoreId),
      getStripeCredentials(user.id, undefined, user.activeStoreId),
      getStoreById(user.activeStoreId, user.id),
    ]);
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
    ...orders.map((order) => order.createdAt),
    ...subscriptions.map((subscription) => subscription.createdAt),
    ...subscribers.map((subscriber) => subscriber.createdAt),
    ...campaigns.map((campaign) =>
      String(campaign.data.sentAt || campaign.createdAt)
    ),
    ...affiliateClicks.map((click) =>
      String(click.data.clickedAt || click.createdAt)
    ),
    ...affiliateReferrals.map((referral) => referral.createdAt),
    ...affiliatePayouts.map((payout) =>
      String(payout.data.paidAt || payout.createdAt)
    ),
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
