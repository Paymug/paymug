"use client";

import { Trash } from "@phosphor-icons/react";
import Link from "next/link";
import { AreaChart } from "@/components/dashboard/charts";
import { CustomSelect } from "@/components/CustomSelect";
import { DeltaLine } from "./DashboardOverviewControls";
import { DashboardGraphShareButton } from "./DashboardGraphShareButton";
import { formatDashboardMetricValue } from "./dashboard-metric-chart.utils";
import type { DashboardMetricChartProps } from "./dashboard-overview.types";

export function DashboardMetricChart({
  group,
  metricKey,
  currency,
  onMetricChange,
  onRemove,
}: DashboardMetricChartProps) {
  const metric =
    group.metrics.find((candidate) => candidate.key === metricKey) ||
    group.metrics[0];

  if (!metric) return null;

  return (
    <article className="group relative flex min-h-72 flex-col border-b border-[#e8e8ee] p-6 lg:border-r lg:nth-[3n]:border-r-0 text-sm">
      <DashboardGraphShareButton
        metric={metric}
        currency={currency}
        className="right-5 top-5"
      />
      <div className="flex items-center gap-3">
        <CustomSelect
          value={metric.key}
          onValueChange={onMetricChange}
          options={group.metrics.map((option) => ({
            value: option.key,
            label: option.label,
          }))}
          variant="plain"
          ariaLabel={`Select ${group.key} graph`}
          triggerClassName="text-sm"
          menuFooter={
            <button
              type="button"
              onClick={onRemove}
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-[15px] leading-5 text-danger outline-none transition hover:bg-red-50"
              aria-label={`Remove ${metric.label} graph`}
            >
              <Trash size={16} weight="bold" aria-hidden />
              Remove
            </button>
          }
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between">
        <p className="text-2xl font-medium tracking-[-0.035em] tabular-nums">
          {formatDashboardMetricValue(metric.value, metric.format, currency)}
        </p>
        <DeltaLine delta={metric.delta} />
      </div>
      <p className="mt-2 text-xs text-muted">
        vs.{" "}
        {formatDashboardMetricValue(
          metric.previousValue,
          metric.format,
          currency
        )}{" "}
        last period
      </p>
      <div className="mt-5 flex-1">
        <AreaChart
          data={metric.data}
          comparisonData={metric.comparisonData}
          height={130}
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
    </article>
  );
}
