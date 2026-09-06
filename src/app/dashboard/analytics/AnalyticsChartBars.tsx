import { formatMoney } from "@/lib/format";
import type { AnalyticsChartBarsProps } from "./analytics.types";

export function AnalyticsChartBars({
  data,
  label,
  currency,
}: AnalyticsChartBarsProps) {
  const maximum = Math.max(1, ...data.map((point) => point.value));

  return (
    <div
      className="pointer-events-none absolute inset-x-1.5 bottom-8 top-2.5 z-0 grid items-end gap-px overflow-hidden"
      style={{
        gridTemplateColumns: `repeat(${Math.max(1, data.length)}, minmax(0, 1fr))`,
      }}
      aria-hidden="true"
    >
      {data.map((point, index) => (
        <div
          key={`${point.date || point.label}-${index}`}
          className="h-full flex items-end justify-center"
          title={`${label}: ${
            currency
              ? formatMoney(point.value, currency)
              : point.value.toLocaleString()
          }`}
        >
          <span
            className="block w-[70%] min-w-px rounded-t-sm bg-[#8b7cf6]/20"
            style={{ height: `${(point.value / maximum) * 100}%` }}
          />
        </div>
      ))}
    </div>
  );
}
