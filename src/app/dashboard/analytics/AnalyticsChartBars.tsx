import { formatMoney } from "@/lib/format";
import type { AnalyticsChartBarsProps } from "./analytics.types";

export function AnalyticsChartBars({ series }: AnalyticsChartBarsProps) {
  const active = series.filter((entry) => entry.data.length > 0);
  if (active.length === 0) return null;

  const length = Math.max(...active.map((entry) => entry.data.length));
  const maximums = active.map((entry) =>
    Math.max(1, ...entry.data.map((point) => point.value)),
  );

  return (
    <div
      className="pointer-events-none absolute inset-x-1.5 bottom-8 top-2.5 z-0 grid items-end overflow-hidden"
      style={{
        gridTemplateColumns: `repeat(${Math.max(1, length)}, minmax(0, 1fr))`,
      }}
      aria-hidden="true"
    >
      {Array.from({ length }).map((_, index) => (
        <div
          key={index}
          className="flex h-full items-end justify-center gap-[3px]"
        >
          {active.map((entry, seriesIndex) => {
            const point = entry.data[index];
            const value = point?.value ?? 0;
            const height = (value / maximums[seriesIndex]) * 100;
            return (
              <span
                key={entry.key}
                title={`${entry.label}: ${
                  entry.currency
                    ? formatMoney(value, entry.currency)
                    : value.toLocaleString()
                }`}
                className="block w-[40%] max-w-[18px] min-w-[2px] rounded-t-sm"
                style={{ height: `${height}%`, backgroundColor: entry.color }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
