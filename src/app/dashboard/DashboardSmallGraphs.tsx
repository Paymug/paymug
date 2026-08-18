import { DashboardMetricChart } from "./DashboardMetricChart";
import type { DashboardSmallGraphsProps } from "./dashboard-overview.types";

export function DashboardSmallGraphs({
  metricGroups,
  currency,
  slots,
  onMetricChange,
  onRemove,
}: DashboardSmallGraphsProps) {
  return (
    <section className="mt-10">
      {!!slots.length && (
        <div className="grid border-l border-t border-[#e8e8ee] md:grid-cols-2 lg:grid-cols-3">
          {slots.map((slot) => {
            const group = metricGroups.find(
              (candidate) => candidate.key === slot.groupKey
            );
            if (!group) return null;
            return (
              <DashboardMetricChart
                key={slot.id}
                group={group}
                metricKey={slot.metricKey}
                currency={currency}
                onMetricChange={(metricKey) =>
                  onMetricChange(slot.id, metricKey)
                }
                onRemove={() => onRemove(slot.id)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
