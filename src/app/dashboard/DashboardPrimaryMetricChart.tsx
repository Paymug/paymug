"use client";

import { useMemo } from "react";
import { AreaChart } from "@/components/dashboard/charts";
import { DeltaLine } from "./DashboardOverviewControls";
import { DashboardGraphShareButton } from "./DashboardGraphShareButton";
import { accumulateDashboardChartPoints } from "./dashboard-accumulated-values.utils";
import { formatDashboardMetricValue } from "./dashboard-metric-chart.utils";
import { useDashboardMetricPreference } from "./dashboard-metric-preference.utils";
import type { DashboardPrimaryMetricChartProps } from "./dashboard-overview.types";

export function DashboardPrimaryMetricChart(
  props: DashboardPrimaryMetricChartProps,
) {
  const {
    metricGroups,
    defaultMetricKey,
    currency,
    showAccumulatedValues,
  } = props;
  const metrics = useMemo(
    () => metricGroups.flatMap((group) => group.metrics),
    [metricGroups],
  );
  const [selectedMetricKey] = useDashboardMetricPreference(
    "main",
    defaultMetricKey,
    metrics,
  );
  const metric =
    metrics.find((candidate) => candidate.key === selectedMetricKey) ||
    metrics[0];

  if (!metric) return null;

  const data = showAccumulatedValues
    ? accumulateDashboardChartPoints(metric.data)
    : metric.data;
  const comparisonData = showAccumulatedValues
    ? accumulateDashboardChartPoints(metric.comparisonData)
    : metric.comparisonData;
  const displayedMetric = { ...metric, data, comparisonData };

  return (
    <section className="group relative pt-8">
      <DashboardGraphShareButton
        metric={displayedMetric}
        currency={currency}
        className="right-0 top-7"
      />
      <div className="flex flex-wrap items-center">
        <p className="text-3xl font-medium leading-none tracking-[-0.04em] tabular-nums">
          {formatDashboardMetricValue(metric.value, metric.format, currency)}
        </p>
        <DeltaLine delta={metric.delta} />
      </div>
      <p className="mt-2 text-sm text-muted">
        vs.{" "}
        {formatDashboardMetricValue(
          metric.previousValue,
          metric.format,
          currency,
        )}{" "}
        last period
      </p>
      <div className="mt-7">
        <AreaChart
          data={data}
          comparisonData={comparisonData}
          height={260}
          color="#f5c518"
          comparisonColor="#a3a3ad"
          fillOpacity={0.025}
          showAxis={false}
          currency={currency}
          valueFormat={metric.format}
          emptyLabel=""
          title={metric.label}
          trendPercent={metric.delta}
        />
      </div>
    </section>
  );
}
