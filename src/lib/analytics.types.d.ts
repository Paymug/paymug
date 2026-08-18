export interface DayPoint {
  date: string;
  label: string;
  newOrders: number;
  newRevenue: number;
  refunds: number;
  refundCount: number;
  allRevenue: number;
  avgOrder: number;
}

export interface AnalyticsBucket {
  newOrders: number;
  newRevenue: number;
  refunds: number;
  refundCount: number;
}

export interface OverviewMetrics {
  currency: string;
  allRevenue: number;
  newOrders: number;
  newOrderRevenue: number;
  avgOrderRevenue: number;
  refunds: number;
  refundCount: number;
  previousRevenue: number;
  deltas: {
    allRevenue: number | null;
    newOrders: number | null;
    newOrderRevenue: number | null;
    avgOrderRevenue: number | null;
    refunds: number | null;
  };
  series: DayPoint[];
  previousSeries: DayPoint[];
  periodDays: number;
}
