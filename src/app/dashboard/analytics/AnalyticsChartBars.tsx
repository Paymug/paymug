import type { AnalyticsChartBarsProps } from "./analytics.types";

export function AnalyticsChartBars({ series }: AnalyticsChartBarsProps) {
  const active = series.filter((entry) => entry.data.length > 0);
  if (active.length === 0) return null;

  const length = Math.max(...active.map((entry) => entry.data.length));
  const maximums = active.map((entry) =>
    Math.max(1, ...entry.data.map((point) => point.value)),
  );
  // Categories are placed edge-to-edge (offset:false), so category i sits at
  // i / (length - 1) of the plot width.
  const stepPercent = length > 1 ? 100 / (length - 1) : 100;
  const groupWidthPercent = length > 1 ? stepPercent * 0.7 : 6;

  return (
    <div
      className="pointer-events-none absolute inset-x-1.5 bottom-8 top-2.5 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {Array.from({ length }).map((_, index) => {
        const leftPercent = length > 1 ? index * stepPercent : 50;
        const transform =
          length <= 1
            ? "translateX(-50%)"
            : index === 0
              ? "translateX(0)"
              : index === length - 1
                ? "translateX(-100%)"
                : "translateX(-50%)";
        return (
          <div
            key={index}
            className="absolute bottom-0 top-0 flex items-end justify-center gap-px"
            style={{
              left: `${leftPercent}%`,
              width: `${groupWidthPercent}%`,
              transform,
            }}
          >
            {active.map((entry, seriesIndex) => {
              const point = entry.data[index];
              const value = point?.value ?? 0;
              const height = (value / maximums[seriesIndex]) * 100;
              return (
                <span
                  key={entry.key}
                  className="block min-w-px flex-1 rounded-t-sm"
                  style={{ height: `${height}%`, backgroundColor: entry.color }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
