import { CaretDown } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { badgeBaseClass, badgeVariantClasses } from "@/components/ui.styles";
import type {
  DeltaLineProps,
  RangePillsProps,
  StatusBadgeProps,
} from "./dashboard.types";

export function RangePills({
  active,
  startLabel,
  endLabel,
}: RangePillsProps) {
  const options = [
    { days: 7, label: "7d" },
    { days: 30, label: "30d" },
    { days: 90, label: "90d" },
  ];

  return (
    <details className="relative">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-[#333] [&::-webkit-details-marker]:hidden">
        {startLabel} — {endLabel}
        <CaretDown size={13} weight="bold" className="text-[#9191aa]" aria-hidden />
      </summary>
      <div className="absolute left-0 top-[calc(100%+0.75rem)] z-30 grid w-40 gap-1 rounded-xl border border-[#e8e8ee] bg-white p-2 shadow-[0_12px_30px_rgb(42_38_63/12%)]">
        {options.map((option) => (
          <Link
            key={option.days}
            href={
              option.days === 30
                ? "/dashboard"
                : `/dashboard?range=${option.days}`
            }
            aria-current={active === option.days ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm ${
              active === option.days
                ? "bg-accent-soft text-accent-hover"
                : "text-[#85859d] hover:bg-accent-soft hover:text-accent-hover"
            }`}
          >
            Last {option.label}
          </Link>
        ))}
      </div>
    </details>
  );
}

export function DeltaLine({ delta }: DeltaLineProps) {
  if (delta === null || !Number.isFinite(delta)) {
    return (
      <span className="ml-2 inline-flex items-center rounded-lg bg-[#fff0f4] px-2 py-1 text-sm font-medium text-[#ef174c]">
        —
      </span>
    );
  }

  const roundedDelta = Math.round(delta);
  const up = roundedDelta > 0;
  const flat = roundedDelta === 0;

  return (
    <span
      className={`ml-2 inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium ${
        up || flat
          ? "bg-[#edfbf3] text-[#179a58]"
          : "bg-[#fff0f4] text-[#ef174c]"
      }`}
    >
      {flat ? "0%" : `${up ? "↑" : "↓"} ${Math.abs(roundedDelta)}%`}
    </span>
  );
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const map: Record<string, keyof typeof badgeVariantClasses> = {
    paid: "success",
    pending: "warning",
    failed: "danger",
    refunded: "muted",
  };

  const variant = map[status] || "muted";

  return (
    <span className={`${badgeBaseClass} ${badgeVariantClasses[variant]}`}>
      {status}
    </span>
  );
}
