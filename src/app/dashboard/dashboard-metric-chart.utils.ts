import { formatMoney } from "@/lib/format";
import type { DashboardMetricSeries } from "./dashboard-overview.types";

export function formatDashboardMetricValue(
  value: number,
  format: DashboardMetricSeries["format"],
  currency: string
) {
  if (format === "money") return formatMoney(value, currency);
  if (format === "percent") return `${value.toFixed(1)}%`;
  return Math.round(value).toLocaleString();
}
