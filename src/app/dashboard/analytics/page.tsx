import Link from "next/link";
import { cookies } from "next/headers";
import {
  dashboardButtonBaseClass,
  dashboardPageClass,
} from "@/components/dashboard/dashboard.styles";
import { getSessionUser } from "@/lib/auth";
import { getStoreById } from "@/lib/stores";
import {
  getEarliestVisitorEventDate,
  listVisitorEvents,
} from "@/lib/visitor-analytics";
import {
  buildVisitorAnalytics,
  getPreviousAnalyticsRange,
} from "@/lib/visitor-analytics.utils";
import {
  dashboardFilterCookieName,
  parseDashboardFilterCookie,
  parseDashboardFilterState,
} from "../dashboard-filter.utils";
import { AnalyticsOverview } from "./AnalyticsOverview";
import type { AnalyticsPageProps } from "./analytics.types";

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const user = await getSessionUser();
  if (!user) return null;
  const store = await getStoreById(user.activeStoreId, user.id);
  if (!store) return null;

  if (!store.analyticsEnabled) {
    return (
      <div className={`${dashboardPageClass} py-16 text-center`}>
        <h1 className="text-2xl font-semibold">Visitor analytics is off</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted">
          Enable analytics in settings to start collecting anonymous storefront
          visit data.
        </p>
        <Link
          href="/dashboard/settings"
          className={`${dashboardButtonBaseClass} mt-6 bg-accent text-[#342900] hover:bg-accent-hover`}
        >
          Open settings
        </Link>
      </div>
    );
  }

  const cookieJar = await cookies();
  const filter = parseDashboardFilterState(
    await searchParams,
    parseDashboardFilterCookie(cookieJar.get(dashboardFilterCookieName)?.value),
  );
  const previousRange = getPreviousAnalyticsRange(
    filter.startDate,
    filter.endDate,
  );
  const [events, earliestDate] = await Promise.all([
    listVisitorEvents(store.id, previousRange.startDate, filter.endDate),
    getEarliestVisitorEventDate(store.id),
  ]);
  const summary = buildVisitorAnalytics({
    events,
    startDate: filter.startDate,
    endDate: filter.endDate,
    interval: filter.interval,
  });

  return (
    <div className={dashboardPageClass}>
      <AnalyticsOverview
        startDate={filter.startDate}
        endDate={filter.endDate}
        interval={filter.interval}
        earliestDate={earliestDate}
        summary={summary}
      />
    </div>
  );
}
