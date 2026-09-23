"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CustomSelect } from "@/components/CustomSelect";
import { AreaChart } from "@/components/dashboard/charts";
import {
  buildAnalyticsCommerceSeries,
  buildVisitorAnalytics,
} from "@/lib/visitor-analytics.utils";
import { DashboardDateRangePicker } from "../DashboardDateRangePicker";
import { DashboardGraphShareButton } from "../DashboardGraphShareButton";
import { DeltaLine } from "../DashboardOverviewControls";
import { saveDashboardFilterPreference } from "../dashboard-filter-preference.utils";
import { AnalyticsBreakdownCard } from "./AnalyticsBreakdownCard";
import { AnalyticsChartBars } from "./AnalyticsChartBars";
import { AnalyticsChartMenu } from "./AnalyticsChartMenu";
import type {
  AnalyticsCommerceMetric,
  AnalyticsMetricKey,
  AnalyticsOverviewProps,
} from "./analytics.types";
import type {
  AnalyticsDimension,
  AnalyticsDimensionFilters,
} from "@/lib/visitor-analytics.types";

const emptyFilters: AnalyticsDimensionFilters = {
  pages: [],
  sources: [],
  devices: [],
  operatingSystems: [],
  cities: [],
  countries: [],
};

const analyticsLineColor = "#3b82f6";

const commerceMetricConfig: Record<
  AnalyticsCommerceMetric,
  {
    label: string;
    barColor: string;
    accentColor: string;
    format: "money" | "number";
  }
> = {
  orders: {
    label: "Orders",
    barColor: "rgba(245, 197, 24, 0.38)",
    accentColor: "#b48a00",
    format: "number",
  },
  revenue: {
    label: "Revenue",
    barColor: "rgba(34, 197, 94, 0.22)",
    accentColor: "#16a34a",
    format: "money",
  },
};

export function AnalyticsOverview({
  startDate,
  endDate,
  interval,
  rangeMode,
  productId,
  products,
  earliestDate,
  events,
  orders,
  currency,
  commerceMetrics: initialCommerceMetrics,
}: AnalyticsOverviewProps) {
  const router = useRouter();
  const [metricKey, setMetricKey] = useState<AnalyticsMetricKey>("visits");
  const [commerceMetrics, setCommerceMetrics] =
    useState<AnalyticsCommerceMetric[]>(initialCommerceMetrics);
  const [filters, setFilters] =
    useState<AnalyticsDimensionFilters>(emptyFilters);
  const summary = useMemo(
    () =>
      buildVisitorAnalytics({
        events,
        startDate,
        endDate,
        interval,
        products,
        productId,
        filters,
      }),
    [endDate, events, filters, interval, productId, products, startDate],
  );
  const commerceSeries = useMemo(
    () =>
      commerceMetrics.map((metric) => {
        const config = commerceMetricConfig[metric];
        return {
          key: metric,
          label: config.label,
          barColor: config.barColor,
          accentColor: config.accentColor,
          format: config.format,
          currency: metric === "revenue" ? currency : undefined,
          data: buildAnalyticsCommerceSeries({
            orders,
            startDate,
            endDate,
            interval,
            productId,
            metric,
          }),
        };
      }),
    [commerceMetrics, currency, endDate, interval, orders, productId, startDate],
  );
  const hasCommerce = commerceMetrics.length > 0;
  const selectedFilterCount = Object.values(filters).reduce(
    (total, values) => total + values.length,
    0,
  );

  function updateProduct(nextProductId: string) {
    saveDashboardFilterPreference({
      startDate,
      endDate,
      interval,
      productId: nextProductId,
      rangeMode,
    });
    setFilters(emptyFilters);
    router.refresh();
  }

  async function updateCommerceMetrics(
    nextCommerceMetrics: AnalyticsCommerceMetric[],
  ) {
    const previousCommerceMetrics = commerceMetrics;
    setCommerceMetrics(nextCommerceMetrics);
    try {
      const response = await fetch("/api/analytics/preference", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commerceMetrics: nextCommerceMetrics }),
      });
      if (!response.ok) throw new Error("Could not save preference");
    } catch {
      setCommerceMetrics(previousCommerceMetrics);
    }
  }

  function toggleFilter(dimension: AnalyticsDimension, value: string) {
    setFilters((current) => ({
      ...current,
      [dimension]: current[dimension].includes(value)
        ? current[dimension].filter((candidate) => candidate !== value)
        : [...current[dimension], value],
    }));
  }
  const metric =
    metricKey === "uniqueVisitors"
      ? {
          key: "uniqueVisitors",
          label: "Unique visitors",
          value: summary.uniqueVisitors,
          previousValue: summary.previousUniqueVisitors,
          delta: summary.uniqueVisitorsDelta,
          data: summary.uniqueVisitorSeries,
          comparisonData: summary.previousUniqueVisitorSeries,
          format: "number" as const,
        }
      : {
          key: "visits",
          label: "Visits",
          value: summary.visits,
          previousValue: summary.previousVisits,
          delta: summary.visitsDelta,
          data: summary.series,
          comparisonData: summary.previousSeries,
          format: "number" as const,
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
            productId={productId}
            rangeMode={rangeMode}
            products={products}
            earliestDate={earliestDate}
          />
          <CustomSelect
            value={productId}
            onValueChange={updateProduct}
            options={[
              { value: "all", label: "All products" },
              ...products.map((product) => ({
                value: product.id,
                label: product.name,
              })),
            ]}
            variant="plain"
            ariaLabel="Product"
            triggerClassName="max-w-56 text-sm font-medium"
          />
        </div>
        <div className="flex items-center gap-5 text-xs text-[#74748f]">
          <span className="inline-flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: analyticsLineColor }}
            />
            Current period
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-5 border-t-2 border-dashed border-[#a3a3ad]" />
            Last period
          </span>
          <AnalyticsChartMenu
            value={commerceMetrics}
            onChange={updateCommerceMetrics}
          />
        </div>
      </div>

      <section className="group relative pt-8">
        <DashboardGraphShareButton
          metric={metric}
          currency={currency}
          className="right-0 top-7"
        />
        <div className="flex flex-wrap items-center">
          <p className="text-3xl font-medium leading-none tracking-[-0.04em] tabular-nums">
            {metric.value.toLocaleString()}
          </p>
          <DeltaLine delta={metric.delta} />
        </div>
        <p className="mt-2 text-sm text-muted">
          vs. {metric.previousValue.toLocaleString()} last period
          {commerceSeries.map((series) => (
            <span
              key={series.key}
              className="ml-4 inline-flex items-center gap-2"
              style={{ color: series.accentColor }}
            >
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: series.barColor }}
              />
              {series.label}
            </span>
          ))}
        </p>
        <div className="relative mt-7">
          {hasCommerce && (
            <AnalyticsChartBars
              series={commerceSeries.map((series) => ({
                key: series.key,
                label: series.label,
                data: series.data,
                color: series.barColor,
                currency: series.currency,
              }))}
            />
          )}
          <AreaChart
            data={metric.data}
            comparisonData={metric.comparisonData}
            height={260}
            color={analyticsLineColor}
            comparisonColor="#a3a3ad"
            fillOpacity={0.025}
            showAxis={false}
            valueFormat="number"
            emptyLabel=""
            title={metric.label}
            trendPercent={metric.delta}
            transparentBackground={hasCommerce}
            className={hasCommerce ? "relative z-10" : ""}
            commerceSeries={
              hasCommerce
                ? commerceSeries.map((series) => ({
                    label: series.label,
                    data: series.data,
                    color: series.accentColor,
                    format: series.format,
                    currency: series.currency,
                  }))
                : undefined
            }
          />
        </div>
      </section>

      {selectedFilterCount > 0 && (
        <div className="mt-8 flex items-center justify-between rounded-xl bg-[#fffaf0] px-4 py-3 text-sm">
          <span>
            {selectedFilterCount} analytics{" "}
            {selectedFilterCount === 1 ? "filter" : "filters"} active
          </span>
          <button
            type="button"
            onClick={() => setFilters(emptyFilters)}
            className="font-medium text-accent-hover hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      <div className="mt-10 grid border-l border-t border-[#e8e8ee] md:grid-cols-2 lg:grid-cols-3">
        <AnalyticsBreakdownCard
          title="Pages"
          dimension="pages"
          items={summary.pages}
          selectedValues={filters.pages}
          onToggle={toggleFilter}
        />
        <AnalyticsBreakdownCard
          title="Sources"
          dimension="sources"
          items={summary.sources}
          selectedValues={filters.sources}
          onToggle={toggleFilter}
        />
        <AnalyticsBreakdownCard
          title="Devices"
          dimension="devices"
          items={summary.devices}
          selectedValues={filters.devices}
          onToggle={toggleFilter}
        />
        <AnalyticsBreakdownCard
          title="Operating systems"
          dimension="operatingSystems"
          items={summary.operatingSystems}
          selectedValues={filters.operatingSystems}
          onToggle={toggleFilter}
        />
        <AnalyticsBreakdownCard
          title="Cities"
          dimension="cities"
          items={summary.cities}
          selectedValues={filters.cities}
          onToggle={toggleFilter}
        />
        <AnalyticsBreakdownCard
          title="Countries"
          dimension="countries"
          items={summary.countries}
          selectedValues={filters.countries}
          onToggle={toggleFilter}
        />
      </div>
    </>
  );
}
