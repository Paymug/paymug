"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createDashboardSmallGraphSlot,
  createDefaultDashboardSmallGraphSlots,
  readDashboardSmallGraphSlots,
  saveDashboardSmallGraphSlots,
} from "./dashboard-small-graphs.utils";
import type {
  DashboardGraphPreferences,
  DashboardMetricGroup,
  DashboardSmallGraphSlot,
} from "./dashboard-overview.types";

const accumulatedValuesStorageKey =
  "paymug.dashboard.mainGraph.accumulatedValues";

function readAccumulatedValuesPreference() {
  try {
    return window.localStorage.getItem(accumulatedValuesStorageKey) === "true";
  } catch {
    return false;
  }
}

function saveAccumulatedValuesPreference(value: boolean) {
  try {
    window.localStorage.setItem(accumulatedValuesStorageKey, String(value));
  } catch {
    // The in-memory preference still works when storage is unavailable.
  }
}

export function useDashboardGraphPreferences(
  metricGroups: DashboardMetricGroup[],
): DashboardGraphPreferences {
  const [slots, setSlots] = useState<DashboardSmallGraphSlot[]>(() =>
    createDefaultDashboardSmallGraphSlots(metricGroups),
  );
  const [showAccumulatedValues, setAccumulatedValues] = useState(false);

  useEffect(() => {
    const storedSlots = readDashboardSmallGraphSlots(metricGroups);
    if (storedSlots) setSlots(storedSlots);
    setAccumulatedValues(readAccumulatedValuesPreference());
  }, [metricGroups]);

  const selectedMetricKeys = useMemo(
    () => new Set(slots.map((slot) => slot.metricKey)),
    [slots],
  );
  const availableMetrics = useMemo(
    () =>
      metricGroups.flatMap((group) =>
        group.metrics
          .filter((metric) => !selectedMetricKeys.has(metric.key))
          .map((metric) => ({
            value: metric.key,
            label: metric.label,
            groupKey: group.key,
          })),
      ),
    [metricGroups, selectedMetricKeys],
  );

  function updateSlots(
    update: (current: DashboardSmallGraphSlot[]) => DashboardSmallGraphSlot[],
  ) {
    setSlots((current) => {
      const next = update(current);
      saveDashboardSmallGraphSlots(next);
      return next;
    });
  }

  function addGraph(metricKey: string) {
    const selected = availableMetrics.find(
      (metric) => metric.value === metricKey,
    );
    if (!selected) return;
    updateSlots((current) => [
      ...current,
      createDashboardSmallGraphSlot(selected.groupKey, selected.value),
    ]);
  }

  function resetGraphs() {
    updateSlots(() => createDefaultDashboardSmallGraphSlots(metricGroups));
  }

  function updateGraphMetric(slotId: string, metricKey: string) {
    updateSlots((current) =>
      current.map((slot) =>
        slot.id === slotId ? { ...slot, metricKey } : slot,
      ),
    );
  }

  function removeGraph(slotId: string) {
    updateSlots((current) =>
      current.filter((slot) => slot.id !== slotId),
    );
  }

  function setShowAccumulatedValues(value: boolean) {
    setAccumulatedValues(value);
    saveAccumulatedValuesPreference(value);
  }

  return {
    slots,
    availableMetrics,
    showAccumulatedValues,
    addGraph,
    resetGraphs,
    updateGraphMetric,
    removeGraph,
    setShowAccumulatedValues,
  };
}
