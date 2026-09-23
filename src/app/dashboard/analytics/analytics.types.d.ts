import type { ChartPoint } from "@/components/dashboard/charts.types";
import type {
  AnalyticsBreakdownItem,
  AnalyticsDimension,
  AnalyticsOrder,
  AnalyticsProduct,
  VisitorEvent,
} from "@/lib/visitor-analytics.types";
import type {
  DashboardInterval,
  DashboardOverviewSearchParams,
} from "../dashboard-overview.types";

export interface AnalyticsPageProps {
  searchParams: Promise<DashboardOverviewSearchParams>;
}

export interface AnalyticsOverviewProps {
  startDate: string;
  endDate: string;
  interval: DashboardInterval;
  rangeMode?: "relative" | "fixed";
  productId: string;
  products: AnalyticsProduct[];
  earliestDate?: string;
  events: VisitorEvent[];
  orders: AnalyticsOrder[];
  currency: string;
  commerceMetrics: AnalyticsCommerceMetric[];
}

export type AnalyticsMetricKey = "visits" | "uniqueVisitors";

export interface AnalyticsBreakdownCardProps {
  title: string;
  dimension: AnalyticsDimension;
  items: AnalyticsBreakdownItem[];
  selectedValues: string[];
  onToggle(dimension: AnalyticsDimension, value: string): void;
  emptyLabel?: string;
}

import type { AnalyticsCommerceMetric } from "@/lib/analytics-commerce.utils";

export type { AnalyticsCommerceMetric };

export interface AnalyticsChartMenuProps {
  value: AnalyticsCommerceMetric[];
  onChange(value: AnalyticsCommerceMetric[]): void;
}

export interface AnalyticsBarSeries {
  key: AnalyticsCommerceMetric;
  label: string;
  data: ChartPoint[];
  color: string;
  currency?: string;
}

export interface AnalyticsChartBarsProps {
  series: AnalyticsBarSeries[];
}
