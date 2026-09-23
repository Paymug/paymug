"use client";

import { Check, DotsThree } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type {
  AnalyticsChartMenuProps,
  AnalyticsCommerceMetric,
} from "./analytics.types";

const options: Array<{ value: AnalyticsCommerceMetric; label: string }> = [
  { value: "orders", label: "Orders" },
  { value: "revenue", label: "Revenue" },
];

export function AnalyticsChartMenu({ value, onChange }: AnalyticsChartMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function toggleOption(option: AnalyticsCommerceMetric) {
    onChange(
      value.includes(option)
        ? value.filter((candidate) => candidate !== option)
        : [...value, option],
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="grid h-9 w-9 place-items-center rounded-xl text-[#74748f] transition hover:bg-[#f7f7f8] hover:text-[#333]"
        aria-label="Analytics chart options"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <DotsThree size={22} weight="bold" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              triggerRef.current?.focus();
            }
          }}
          className="absolute right-0 top-[calc(100%+0.55rem)] z-70 w-48 overflow-hidden rounded-xl border border-[#d7e0ea] bg-white py-2 shadow-[0_20px_45px_rgba(28,39,55,0.18)]"
        >
          <p className="px-4 pb-1 pt-1 text-xs font-medium text-muted">
            Overlay metrics
          </p>
          {options.map((option) => {
            const selected = value.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemcheckbox"
                aria-checked={selected}
                onClick={() => toggleOption(option.value)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-[#f7f7f8]"
              >
                <span className="grid w-4 place-items-center">
                  {selected && <Check size={15} weight="bold" aria-hidden />}
                </span>
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
