import type { DashboardOverviewSearchParams } from "./dashboard-overview.types";

export interface DashboardPageProps {
  searchParams: Promise<DashboardOverviewSearchParams>;
}

export interface RangePillsProps {
  active: number;
  startLabel: string;
  endLabel: string;
}

export interface DeltaLineProps {
  delta: number | null;
}

export interface StatusBadgeProps {
  status: string;
}
