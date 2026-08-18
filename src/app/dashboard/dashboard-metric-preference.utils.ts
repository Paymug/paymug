"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  DashboardMetricPreferenceEventDetail,
  DashboardMetricSeries,
} from "./dashboard-overview.types";

const dashboardMetricPreferenceEvent = "paymug:dashboard-metric-change";

function getDashboardMetricStorageKey(scope: string) {
  return `paymug.dashboard.metric.${scope}`;
}

export function useDashboardMetricPreference(
  scope: string,
  defaultMetricKey: string,
  metrics: DashboardMetricSeries[]
) {
  const [selectedMetricKey, setSelectedMetricKey] = useState(defaultMetricKey);

  useEffect(() => {
    let nextMetricKey = defaultMetricKey;
    try {
      const storedMetricKey = window.localStorage.getItem(
        getDashboardMetricStorageKey(scope)
      );
      if (
        storedMetricKey &&
        metrics.some((metric) => metric.key === storedMetricKey)
      ) {
        nextMetricKey = storedMetricKey;
      }
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
    setSelectedMetricKey(nextMetricKey);
  }, [defaultMetricKey, metrics, scope]);

  useEffect(() => {
    const syncMetricSelection = (event: Event) => {
      const detail = (event as CustomEvent<DashboardMetricPreferenceEventDetail>)
        .detail;
      if (
        detail.scope === scope &&
        metrics.some((metric) => metric.key === detail.metricKey)
      ) {
        setSelectedMetricKey(detail.metricKey);
      }
    };
    window.addEventListener(
      dashboardMetricPreferenceEvent,
      syncMetricSelection,
    );
    return () =>
      window.removeEventListener(
        dashboardMetricPreferenceEvent,
        syncMetricSelection,
      );
  }, [metrics, scope]);

  const selectMetric = useCallback(
    (metricKey: string) => {
      if (!metrics.some((metric) => metric.key === metricKey)) return;
      setSelectedMetricKey(metricKey);
      try {
        window.localStorage.setItem(
          getDashboardMetricStorageKey(scope),
          metricKey
        );
      } catch {
        // The in-memory selection still works when storage is unavailable.
      }
      window.dispatchEvent(
        new CustomEvent<DashboardMetricPreferenceEventDetail>(
          dashboardMetricPreferenceEvent,
          { detail: { scope, metricKey } },
        ),
      );
    },
    [metrics, scope]
  );

  return [selectedMetricKey, selectMetric] as const;
}
