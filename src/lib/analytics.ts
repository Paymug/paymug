import type { Order } from "./types";
import type {
  AnalyticsBucket,
  DayPoint,
  OverviewMetrics,
} from "./analytics.types";
import { dayKey, formatDayLabel, pctChange } from "./analytics.utils";

export type { DayPoint, OverviewMetrics } from "./analytics.types";

export function rangeDays(days: number, end = new Date()): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    out.push(dayKey(d.toISOString()));
  }
  return out;
}

/**
 * Build daily series for the last `days` days from store orders.
 * - newOrders / newRevenue: paid orders created that day
 * - refunds: refunded orders by paidAt or createdAt day
 * - allRevenue / avgOrder: cumulative over the window
 */
export function buildDailySeries(
  orders: Order[],
  days = 30,
  end = new Date(),
): DayPoint[] {
  const keys = rangeDays(days, end);
  const start = keys[0];

  const map = new Map<string, AnalyticsBucket>();
  for (const k of keys) {
    map.set(k, { newOrders: 0, newRevenue: 0, refunds: 0, refundCount: 0 });
  }

  for (const o of orders) {
    const paidKey = dayKey(o.paidAt || o.createdAt);
    const createdKey = dayKey(o.createdAt);

    if (o.status === "paid" && paidKey >= start && map.has(paidKey)) {
      const b = map.get(paidKey)!;
      b.newOrders += 1;
      b.newRevenue += o.amount;
    }

    if (o.status === "refunded") {
      const rk = dayKey(o.paidAt || o.createdAt);
      if (rk >= start && map.has(rk)) {
        const b = map.get(rk)!;
        b.refunds += o.amount;
        b.refundCount += 1;
      } else if (createdKey >= start && map.has(createdKey)) {
        const b = map.get(createdKey)!;
        b.refunds += o.amount;
        b.refundCount += 1;
      }
    }
  }

  let runningRevenue = 0;
  let runningOrders = 0;

  return keys.map((date) => {
    const b = map.get(date)!;
    runningRevenue += b.newRevenue;
    runningOrders += b.newOrders;
    return {
      date,
      label: formatDayLabel(date),
      newOrders: b.newOrders,
      newRevenue: b.newRevenue,
      refunds: b.refunds,
      refundCount: b.refundCount,
      allRevenue: runningRevenue,
      avgOrder: runningOrders > 0 ? Math.round(runningRevenue / runningOrders) : 0,
    };
  });
}

export function computeOverview(orders: Order[], periodDays = 30): OverviewMetrics {
  const series = buildDailySeries(orders, periodDays);

  const allRevenue = series[series.length - 1]?.allRevenue ?? 0;
  const newOrders = series.reduce((s, d) => s + d.newOrders, 0);
  const newOrderRevenue = series.reduce((s, d) => s + d.newRevenue, 0);
  const avgOrderRevenue = newOrders > 0 ? Math.round(newOrderRevenue / newOrders) : 0;
  const refunds = series.reduce((s, d) => s + d.refunds, 0);
  const refundCount = series.reduce((s, d) => s + d.refundCount, 0);

  // Previous window of equal length for % deltas
  const prevEnd = new Date();
  prevEnd.setDate(prevEnd.getDate() - periodDays);
  const previousSeries = buildDailySeries(orders, periodDays, prevEnd);
  const prevKeys = rangeDays(periodDays, prevEnd);
  const prevStart = prevKeys[0];
  const prevEndKey = prevKeys[prevKeys.length - 1];

  let prevRevenue = 0;
  let prevOrders = 0;
  let prevRefunds = 0;
  for (const o of orders) {
    const k = dayKey(o.paidAt || o.createdAt);
    if (k < prevStart || k > prevEndKey) continue;
    if (o.status === "paid") {
      prevRevenue += o.amount;
      prevOrders += 1;
    }
    if (o.status === "refunded") {
      prevRefunds += o.amount;
    }
  }
  const prevAvg = prevOrders > 0 ? Math.round(prevRevenue / prevOrders) : 0;

  // Current window totals already computed; for allRevenue delta use same-window comparison
  const currency =
    orders.find((o) => o.status === "paid")?.currency ||
    orders[0]?.currency ||
    "USD";

  return {
    currency,
    allRevenue,
    newOrders,
    newOrderRevenue,
    avgOrderRevenue,
    refunds,
    refundCount,
    previousRevenue: prevRevenue,
    deltas: {
      allRevenue: pctChange(newOrderRevenue, prevRevenue),
      newOrders: pctChange(newOrders, prevOrders),
      newOrderRevenue: pctChange(newOrderRevenue, prevRevenue),
      avgOrderRevenue: pctChange(avgOrderRevenue, prevAvg),
      refunds: pctChange(refunds, prevRefunds),
    },
    series,
    previousSeries,
    periodDays,
  };
}
