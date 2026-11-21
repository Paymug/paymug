"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";
import type { StatusMultiFilterProps } from "./StatusMultiFilter.types";

/** Plain-variant multi-select. Empty `values` means "all". */
export function StatusMultiFilter({
  values,
  options,
  allLabel,
  ariaLabel,
  onChange,
}: StatusMultiFilterProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.filter((option) => values.includes(option.value));
  const summary =
    selected.length === 0
      ? allLabel
      : selected.length <= 2
        ? selected.map((option) => option.label).join(", ")
        : `${selected.length} selected`;

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex max-w-full cursor-pointer items-center gap-2 bg-transparent py-1 text-left text-sm text-[#27272f] outline-none"
      >
        <span className="truncate">{summary}</span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={14}
          className={`shrink-0 text-[#656b78] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
          strokeWidth={2}
        />
      </button>
      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label={ariaLabel}
          className="absolute right-0 top-[calc(100%+0.65rem)] z-70 max-h-96 min-w-46 max-w-68 overflow-y-auto rounded-xl border border-[#d7e0ea] bg-white py-3 shadow-[0_20px_45px_rgba(28,39,55,0.18)]"
        >
          <button
            type="button"
            onClick={() => onChange([])}
            className={`flex w-full cursor-pointer items-center gap-3 py-2.5 pr-4 pl-3 text-left text-sm leading-5 transition ${
              values.length === 0
                ? "bg-accent-soft text-yellow-700"
                : "hover:bg-[#f7f7f8]"
            }`}
          >
            <span className="grid w-4 shrink-0 place-items-center">
              {values.length === 0 && (
                <HugeiconsIcon icon={Tick02Icon} size={14} aria-hidden strokeWidth={2} />
              )}
            </span>
            {allLabel}
          </button>
          {options.map((option) => {
            const isSelected = values.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() =>
                  onChange(
                    isSelected
                      ? values.filter((value) => value !== option.value)
                      : [...values, option.value],
                  )
                }
                className={`flex w-full cursor-pointer items-center gap-3 py-2.5 pr-4 pl-3 text-left text-sm leading-5 transition ${
                  isSelected
                    ? "bg-accent-soft text-yellow-700"
                    : "hover:bg-[#f7f7f8]"
                }`}
              >
                <span className="grid w-4 shrink-0 place-items-center">
                  {isSelected && (
                    <HugeiconsIcon icon={Tick02Icon} size={14} aria-hidden strokeWidth={2} />
                  )}
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
