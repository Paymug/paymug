"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CustomSelect } from "@/components/CustomSelect";
import { DashboardDateRangePicker } from "./DashboardDateRangePicker";
import { DashboardGraphMenu } from "./DashboardGraphMenu";
import { useDashboardMetricPreference } from "./dashboard-metric-preference.utils";
import {
  dashboardFilterStatesMatch,
  hasDashboardFilterCookie,
  readDashboardFilterPreference,
  saveDashboardFilterPreference,
} from "./dashboard-filter-preference.utils";
import type { DashboardOverviewFiltersProps } from "./dashboard-overview.types";

export function DashboardOverviewFilters(props: DashboardOverviewFiltersProps) {
  const router = useRouter();
  const metrics = useMemo(
    () => props.metricGroups.flatMap((group) => group.metrics),
    [props.metricGroups]
  );
  const [selectedMetricKey, selectMetric] = useDashboardMetricPreference(
    "main",
    props.defaultMetricKey,
    metrics
  );

  useEffect(() => {
    const currentState = {
      startDate: props.startDate,
      endDate: props.endDate,
      interval: props.interval,
      productId: props.productId,
    };
    const storedState = readDashboardFilterPreference(
      props.products.map((product) => product.id)
    );
    if (
      storedState &&
      !hasDashboardFilterCookie() &&
      !dashboardFilterStatesMatch(currentState, storedState)
    ) {
      saveDashboardFilterPreference(storedState);
      router.refresh();
      return;
    }
    saveDashboardFilterPreference(currentState);
  }, [
    props.endDate,
    props.interval,
    props.productId,
    props.products,
    props.startDate,
    router,
  ]);

  function updateProduct(productId: string) {
    const nextState = {
      startDate: props.startDate,
      endDate: props.endDate,
      interval: props.interval,
      productId,
    };
    saveDashboardFilterPreference(nextState);
    router.refresh();
  }

  return (
    <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-4 border-b border-[#e8e8ee]">
      <div className="flex flex-wrap items-center gap-7">
        <CustomSelect
          value={selectedMetricKey}
          onValueChange={selectMetric}
          options={metrics.map((metric) => ({
            value: metric.key,
            label: metric.label,
          }))}
          variant="plain"
          ariaLabel="Select main graph"
          triggerClassName="text-sm font-medium"
        />
        <DashboardDateRangePicker {...props} />
        <CustomSelect
          value={props.productId}
          onValueChange={updateProduct}
          options={[
            { value: "all", label: "All products" },
            ...props.products.map((product) => ({
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
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          Current period
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-5 border-t-2 border-dashed border-[#a3a3ad]" />
          Last period
        </span>
        <DashboardGraphMenu
          availableMetrics={props.availableMetrics}
          showAccumulatedValues={props.showAccumulatedValues}
          onAddGraph={props.onAddGraph}
          onResetGraphs={props.onResetGraphs}
          onShowAccumulatedValuesChange={
            props.onShowAccumulatedValuesChange
          }
        />
      </div>
    </div>
  );
}
