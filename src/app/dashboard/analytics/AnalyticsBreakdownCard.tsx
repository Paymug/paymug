import type { AnalyticsBreakdownCardProps } from "./analytics.types";

export function AnalyticsBreakdownCard({
  title,
  items,
  emptyLabel = "No visitor data in this period",
}: AnalyticsBreakdownCardProps) {
  return (
    <section className="flex aspect-square min-h-72 flex-col overflow-hidden border-b border-r border-[#e8e8ee] bg-white">
      <h2 className="border-b border-[#e8e8ee] px-5 py-4 text-base font-semibold">
        {title}
      </h2>
      {items.length ? (
        <div className="min-h-0 flex-1 divide-y divide-[#ededf2] overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.label}
              className="relative flex items-center justify-between gap-4 px-5 py-3"
            >
              <div
                className="absolute inset-y-1 left-2 rounded-md bg-[#fff8e5]"
                style={{ width: `calc(${item.share}% - 0.5rem)` }}
              />
              <span className="relative min-w-0 truncate text-sm font-medium text-[#454552]">
                {item.label}
              </span>
              <span className="relative shrink-0 text-sm tabular-nums text-[#77778d]">
                {item.visits.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-5 py-10 text-center text-sm text-muted">{emptyLabel}</p>
      )}
    </section>
  );
}
