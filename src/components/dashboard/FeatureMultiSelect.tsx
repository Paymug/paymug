"use client";

import { CaretDown, Check } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { FeatureMultiSelectProps } from "./FeatureMultiSelect.types";

export function FeatureMultiSelect({
  label,
  name,
  value,
  options,
  onChange,
}: FeatureMultiSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = value ? value.split(",").filter(Boolean) : ["all"];
  const allSelected = selected.includes("all");
  const selectedLabels = allSelected
    ? ["All products"]
    : options
        .filter((option) => selected.includes(option.value))
        .map((option) => option.label);

  function toggle(optionValue: string) {
    if (optionValue === "all") {
      onChange("all");
      return;
    }
    const next = allSelected
      ? [optionValue]
      : selected.includes(optionValue)
        ? selected.filter((item) => item !== optionValue)
        : [...selected, optionValue];
    onChange(next.length > 0 ? next.join(",") : "all");
  }

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1.5 block text-sm font-medium" htmlFor={name}>
        {label}
      </label>
      <button
        id={name}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${name}-menu`}
        className="flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border border-border bg-white px-3.5 py-2.5 text-left text-sm outline-none focus:border-accent focus:ring-3 focus:ring-accent/25"
      >
        <span className="truncate">
          {selectedLabels.length > 0
            ? selectedLabels.join(", ")
            : "All products"}
        </span>
        <CaretDown
          size={14}
          weight="bold"
          className={`shrink-0 text-[#656b78] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div
          id={`${name}-menu`}
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 top-[calc(100%+0.65rem)] z-[70] max-h-96 w-full overflow-y-auto rounded-xl border border-[#d7e0ea] bg-white py-3 shadow-[0_20px_45px_rgba(28,39,55,0.18)]"
        >
          {options.map((option) => {
            const checked =
              option.value === "all"
                ? allSelected
                : !allSelected && selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={checked}
                onClick={() => toggle(option.value)}
                className={`flex w-full items-center gap-3 px-5 py-3 text-left text-[15px] leading-5 outline-none transition hover:bg-accent-soft ${
                  checked ? "text-accent-hover" : "text-[#20304a]"
                }`}
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center">
                  {checked && <Check size={19} weight="bold" />}
                </span>
                <span className="whitespace-nowrap">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
