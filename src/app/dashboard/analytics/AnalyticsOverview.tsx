"use client";

import { useState } from "react";
import { CustomSelect } from "@/components/CustomSelect";
import { AreaChart } from "@/components/dashboard/charts";
import { DashboardDateRangePicker } from "../DashboardDateRangePicker";
import { DeltaLine } from "../DashboardOverviewControls";
import { AnalyticsBreakdownCard } from "./AnalyticsBreakdownCard";
import type {
  AnalyticsMetricKey,
  AnalyticsOverviewProps,
} from "./analytics.types";

export function AnalyticsOverview({
  startDate,
  endDate,
  interval,
  earliestDate,
  summary,
}: AnalyticsOverviewProps) {
  const [metricKey, setMetricKey] = useState<AnalyticsMetricKey>("visits");
  const metric =
    metricKey === "uniqueVisitors"
      ? {
          label: "Unique visitors",
          value: summary.uniqueVisitors,
          previousValue: summary.previousUniqueVisitors,
          delta: summary.uniqueVisitorsDelta,
          data: summary.uniqueVisitorSeries,
          comparisonData: summary.previousUniqueVisitorSeries,
        }
      : {
          label: "Visits",
          value: summary.visits,
          previousValue: summary.previousVisits,
          delta: summary.visitsDelta,
          data: summary.series,
          comparisonData: summary.previousSeries,
        };

  return (
    <>
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-4 border-b border-[#e8e8ee]">
        <div className="flex flex-wrap items-center gap-7">
          <CustomSelect
            value={metricKey}
            onValueChange={(value) => setMetricKey(value as AnalyticsMetricKey)}
            options={[
              { value: "visits", label: "Visits" },
              { value: "uniqueVisitors", label: "Unique visitors" },
            ]}
            variant="plain"
            ariaLabel="Select analytics graph"
            triggerClassName="text-sm font-medium"
          />
          <DashboardDateRangePicker
            startDate={startDate}
            endDate={endDate}
            interval={interval}
            productId="all"
            products={[]}
            earliestDate={earliestDate}
          />
        </div>
        <div className="flex items-center gap-5 text-xs text-[#74748f]">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" />
            Current period
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-5 border-t-2 border-dashed border-[#a3a3ad]" />
            Last period
          </span>
        </div>
      </div>

      <section className="pt-8">
        <div className="flex flex-wrap items-center">
          <p className="text-3xl font-medium leading-none tracking-[-0.04em] tabular-nums">
            {metric.value.toLocaleString()}
          </p>
          <DeltaLine delta={metric.delta} />
        </div>
        <p className="mt-2 text-sm text-muted">
          vs. {metric.previousValue.toLocaleString()} last period
        </p>
        <div className="mt-7">
          <AreaChart
            data={metric.data}
            comparisonData={metric.comparisonData}
            height={260}
            color="#f5c518"
            comparisonColor="#a3a3ad"
            fillOpacity={0.025}
            showAxis={false}
            valueFormat="number"
            emptyLabel=""
            title={metric.label}
            trendPercent={metric.delta}
          />
        </div>
      </section>

      <div className="mt-10 grid border-l border-t border-[#e8e8ee] md:grid-cols-2 lg:grid-cols-3">
        <AnalyticsBreakdownCard title="Pages" items={summary.pages} />
        <AnalyticsBreakdownCard title="Sources" items={summary.sources} />
        <AnalyticsBreakdownCard title="Devices" items={summary.devices} />
        <AnalyticsBreakdownCard
          title="Operating systems"
          items={summary.operatingSystems}
        />
        <AnalyticsBreakdownCard title="Cities" items={summary.cities} />
        <AnalyticsBreakdownCard title="Countries" items={summary.countries} />
      </div>
    </>
  );
}
