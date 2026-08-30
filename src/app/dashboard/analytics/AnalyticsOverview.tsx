"use client";

import { AreaChart } from "@/components/dashboard/charts";
import { DashboardDateRangePicker } from "../DashboardDateRangePicker";
import { DeltaLine } from "../DashboardOverviewControls";
import { AnalyticsBreakdownCard } from "./AnalyticsBreakdownCard";
import type { AnalyticsOverviewProps } from "./analytics.types";

export function AnalyticsOverview({
  storeName,
  startDate,
  endDate,
  interval,
  earliestDate,
  summary,
}: AnalyticsOverviewProps) {
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-[#ededf2] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">Visitor analytics for</p>
          <p className="mt-1 font-semibold text-[#333]">{storeName}</p>
        </div>
        <DashboardDateRangePicker
          startDate={startDate}
          endDate={endDate}
          interval={interval}
          productId="all"
          products={[]}
          earliestDate={earliestDate}
        />
      </div>

      <section className="mt-6 overflow-hidden rounded-xl border border-[#e8e8ee] bg-white">
        <div className="grid divide-y divide-[#e8e8ee] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="px-5 py-5 sm:px-6">
            <p className="text-sm font-medium text-muted">Visits</p>
            <div className="mt-2 flex items-center">
              <p className="text-3xl font-semibold tracking-tight tabular-nums">
                {summary.visits.toLocaleString()}
              </p>
              <DeltaLine delta={summary.visitsDelta} />
            </div>
            <p className="mt-1 text-xs text-muted">
              {summary.previousVisits.toLocaleString()} last period
            </p>
          </div>
          <div className="px-5 py-5 sm:px-6">
            <p className="text-sm font-medium text-muted">Unique visitors</p>
            <div className="mt-2 flex items-center">
              <p className="text-3xl font-semibold tracking-tight tabular-nums">
                {summary.uniqueVisitors.toLocaleString()}
              </p>
              <DeltaLine delta={summary.uniqueVisitorsDelta} />
            </div>
            <p className="mt-1 text-xs text-muted">
              {summary.previousUniqueVisitors.toLocaleString()} last period
            </p>
          </div>
        </div>
        <div className="border-t border-[#e8e8ee] px-3 pb-2 pt-5 sm:px-6">
          <AreaChart
            data={summary.series}
            comparisonData={summary.previousSeries}
            height={280}
            color="#f5c518"
            comparisonColor="#a3a3ad"
            fillOpacity={0.035}
            valueFormat="number"
            title="Visits"
            trendPercent={summary.visitsDelta}
          />
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
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
