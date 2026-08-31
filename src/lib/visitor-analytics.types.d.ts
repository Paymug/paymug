import type { ChartPoint } from "@/components/dashboard/charts.types";
import type { DashboardInterval } from "@/app/dashboard/dashboard-overview.types";

export interface VisitorEvent {
  id: string;
  storeId: string;
  visitorId: string;
  path: string;
  source: string;
  device: string;
  os: string;
  city: string;
  country: string;
  createdAt: string;
}

export interface RecordVisitorEventInput {
  storeId: string;
  visitorId: string;
  path: string;
  source: string;
  device: string;
  os: string;
  city: string;
  country: string;
}

export interface AnalyticsBreakdownItem {
  label: string;
  visits: number;
  share: number;
}

export interface VisitorAnalyticsSummary {
  visits: number;
  uniqueVisitors: number;
  previousVisits: number;
  previousUniqueVisitors: number;
  visitsDelta: number | null;
  uniqueVisitorsDelta: number | null;
  series: ChartPoint[];
  previousSeries: ChartPoint[];
  uniqueVisitorSeries: ChartPoint[];
  previousUniqueVisitorSeries: ChartPoint[];
  sources: AnalyticsBreakdownItem[];
  pages: AnalyticsBreakdownItem[];
  devices: AnalyticsBreakdownItem[];
  operatingSystems: AnalyticsBreakdownItem[];
  cities: AnalyticsBreakdownItem[];
  countries: AnalyticsBreakdownItem[];
}

export interface BuildVisitorAnalyticsInput {
  events: VisitorEvent[];
  startDate: string;
  endDate: string;
  interval: DashboardInterval;
}
