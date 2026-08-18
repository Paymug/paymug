"use client";

import { DashboardOverviewFilters } from "./DashboardOverviewFilters";
import { DashboardPrimaryMetricChart } from "./DashboardPrimaryMetricChart";
import { DashboardSmallGraphs } from "./DashboardSmallGraphs";
import { useDashboardGraphPreferences } from "./use-dashboard-graph-preferences";
import type { DashboardOverviewProps } from "./dashboard-overview.types";

export function DashboardOverview(props: DashboardOverviewProps) {
  const graphs = useDashboardGraphPreferences(props.metricGroups);

  return (
    <>
      <DashboardOverviewFilters
        {...props}
        availableMetrics={graphs.availableMetrics}
        showAccumulatedValues={graphs.showAccumulatedValues}
        onAddGraph={graphs.addGraph}
        onResetGraphs={graphs.resetGraphs}
        onShowAccumulatedValuesChange={graphs.setShowAccumulatedValues}
      />
      {props.children}
      <DashboardPrimaryMetricChart
        metricGroups={props.metricGroups}
        defaultMetricKey={props.defaultMetricKey}
        currency={props.currency}
        showAccumulatedValues={graphs.showAccumulatedValues}
      />
      <DashboardSmallGraphs
        metricGroups={props.metricGroups}
        currency={props.currency}
        slots={graphs.slots}
        onMetricChange={graphs.updateGraphMetric}
        onRemove={graphs.removeGraph}
      />
    </>
  );
}
