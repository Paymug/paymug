import type { ChartPoint } from "@/components/dashboard/charts.types";

export function accumulateDashboardChartPoints(points: ChartPoint[]) {
  let total = 0;
  return points.map((point) => {
    total += point.value;
    return { ...point, value: total };
  });
}
