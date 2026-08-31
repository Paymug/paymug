import type { AnalyticsBreakdownItem, VisitorAnalyticsSummary } from "@/lib/visitor-analytics.types";
import type { DashboardOverviewSearchParams } from "../dashboard-overview.types";
import type { DashboardInterval } from "../dashboard-overview.types";

export interface AnalyticsPageProps {
  searchParams: Promise<DashboardOverviewSearchParams>;
}

export interface AnalyticsOverviewProps {
  startDate: string;
  endDate: string;
  interval: DashboardInterval;
  earliestDate?: string;
  summary: VisitorAnalyticsSummary;
}

export type AnalyticsMetricKey = "visits" | "uniqueVisitors";

export interface AnalyticsBreakdownCardProps {
  title: string;
  items: AnalyticsBreakdownItem[];
  emptyLabel?: string;
}
