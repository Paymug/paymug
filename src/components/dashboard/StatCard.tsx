import { CaretDown } from "@phosphor-icons/react/ssr";
import type { StatCardProps } from "./StatCard.types";

export function StatCard({
  label,
  value,
  sub,
  delta,
  invertDelta = false,
}: StatCardProps) {
  const hasDelta = delta !== undefined && delta !== null && Number.isFinite(delta);
  const up = (delta ?? 0) > 0;
  const good = invertDelta ? !up : up;
  const flat = hasDelta && Math.abs(delta!) < 0.05;

  return (
    <div className="min-w-0 py-5 md:px-6 md:first:pl-0 md:[&+&]:border-l md:[&+&]:border-[#e8e8ee]">
      <p className="flex items-center gap-1.5 text-sm text-[#333]">
        {label}
        <CaretDown size={13} weight="bold" className="text-[#9191aa]" aria-hidden />
      </p>
      <div className="flex flex-wrap items-center justify-between">
        <p className="mt-2 text-xl font-medium leading-none tracking-[-0.04em] tabular-nums text-[#333] flex-1">
          {value}
        </p>
        {hasDelta && (
          <span
            className={`ml-2 inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium ${
              flat || good
                ? "bg-[#edfbf3] text-[#179a58]"
                : "bg-[#fff0f4] text-[#ef174c]"
            }`}
          >
            {flat ? "—" : up ? "↑" : "↓"}{" "}
            {flat ? "0%" : `${Math.abs(delta!).toFixed(1)}%`}
          </span>
        )}
      </div>
      {sub && <p className="mt-2 text-sm text-[#85859d]">{sub}</p>}
    </div>
  );
}
