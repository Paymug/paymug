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

export type AnalyticsCommerceMetric = "orders" | "revenue";

export interface AnalyticsChartMenuProps {
  value: AnalyticsCommerceMetric | null;
  onChange(value: AnalyticsCommerceMetric | null): void;
}

export interface AnalyticsChartBarsProps {
  data: ChartPoint[];
  label: string;
  currency?: string;
}
