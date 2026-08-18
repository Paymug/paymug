import type {
  DashboardMetricGroup,
  DashboardMetricGroupKey,
  DashboardSmallGraphSlot,
} from "./dashboard-overview.types";

const dashboardSmallGraphsStorageKey = "paymug.dashboard.smallGraphs";

function getLegacyMetricStorageKey(groupKey: DashboardMetricGroupKey) {
  return `paymug.dashboard.metric.small.${groupKey}`;
}

function getDefaultMetricKey(group: DashboardMetricGroup) {
  return group.metrics.some((metric) => metric.key === group.defaultMetricKey)
    ? group.defaultMetricKey
    : group.metrics[0]?.key;
}

export function createDefaultDashboardSmallGraphSlots(
  metricGroups: DashboardMetricGroup[]
) {
  return metricGroups.flatMap((group) => {
    const metricKey = getDefaultMetricKey(group);
    return metricKey
      ? [
          {
            id: `dashboard-small-${group.key}`,
            groupKey: group.key,
            metricKey,
          },
        ]
      : [];
  });
}

function createMigratedDashboardSmallGraphSlots(
  metricGroups: DashboardMetricGroup[]
) {
  return createDefaultDashboardSmallGraphSlots(metricGroups).map((slot) => {
    const group = metricGroups.find(
      (candidate) => candidate.key === slot.groupKey
    );
    const legacyMetricKey = window.localStorage.getItem(
      getLegacyMetricStorageKey(slot.groupKey)
    );
    return group?.metrics.some((metric) => metric.key === legacyMetricKey)
      ? { ...slot, metricKey: legacyMetricKey as string }
      : slot;
  });
}

export function readDashboardSmallGraphSlots(
  metricGroups: DashboardMetricGroup[]
): DashboardSmallGraphSlot[] | undefined {
  try {
    const stored = window.localStorage.getItem(
      dashboardSmallGraphsStorageKey
    );
    if (!stored) {
      const migrated = createMigratedDashboardSmallGraphSlots(metricGroups);
      saveDashboardSmallGraphSlots(migrated);
      return migrated;
    }

    const value = JSON.parse(stored) as unknown;
    if (!Array.isArray(value)) return undefined;

    const usedIds = new Set<string>();
    return value.flatMap((candidate) => {
      if (!candidate || typeof candidate !== "object") return [];
      const slot = candidate as Partial<DashboardSmallGraphSlot>;
      if (
        typeof slot.id !== "string" ||
        usedIds.has(slot.id) ||
        typeof slot.groupKey !== "string" ||
        typeof slot.metricKey !== "string"
      ) {
        return [];
      }
      const group = metricGroups.find(
        (item) => item.key === slot.groupKey
      );
      if (!group?.metrics.some((metric) => metric.key === slot.metricKey)) {
        return [];
      }
      usedIds.add(slot.id);
      return [slot as DashboardSmallGraphSlot];
    });
  } catch {
    return undefined;
  }
}

export function saveDashboardSmallGraphSlots(
  slots: DashboardSmallGraphSlot[]
) {
  try {
    window.localStorage.setItem(
      dashboardSmallGraphsStorageKey,
      JSON.stringify(slots)
    );
  } catch {
    // The in-memory layout still works when storage is unavailable.
  }
}

export function createDashboardSmallGraphSlot(
  groupKey: DashboardMetricGroupKey,
  metricKey: string
): DashboardSmallGraphSlot {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${groupKey}-${metricKey}-${Date.now()}`;
  return { id, groupKey, metricKey };
}
