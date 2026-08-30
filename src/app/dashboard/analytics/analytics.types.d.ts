import type { AnalyticsBreakdownItem, VisitorAnalyticsSummary } from "@/lib/visitor-analytics.types";
import type { DashboardOverviewSearchParams } from "../dashboard-overview.types";

export interface AnalyticsPageProps {
  searchParams: Promise<DashboardOverviewSearchParams>;
}

export interface AnalyticsOverviewProps {
  storeName: string;
  startDate: string;
  endDate: string;
  interval: "daily" | "weekly" | "monthly";
  earliestDate?: string;
  summary: VisitorAnalyticsSummary;
}

export interface AnalyticsBreakdownCardProps {
  title: string;
  items: AnalyticsBreakdownItem[];
  emptyLabel?: string;
}
