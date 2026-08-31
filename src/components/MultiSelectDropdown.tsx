"use client";

import { CaretDown, Check } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { labelClass } from "./ui.styles";
import type { MultiSelectDropdownProps } from "./MultiSelectDropdown.types";

export function MultiSelectDropdown({
  label,
  name,
  values,
  options,
  placeholder,
  menuFooter,
  onChange,
}: MultiSelectDropdownProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selectedLabels = options
    .filter((option) => values.includes(option.value))
    .map((option) => option.label);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <label className={labelClass} htmlFor={name}>
        {label}
      </label>
      <button
        id={name}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="mt-1.5 flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border border-border bg-white px-3.5 py-2.5 text-left text-sm outline-none focus:border-accent focus:ring-3 focus:ring-accent/25"
      >
        <span className={selectedLabels.length ? "truncate" : "truncate text-muted"}>
          {selectedLabels.length ? selectedLabels.join(", ") : placeholder}
        </span>
        <CaretDown
          size={14}
          weight="bold"
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 top-[calc(100%+0.5rem)] z-[90] max-h-72 w-full overflow-y-auto rounded-xl border border-border bg-white py-2 shadow-[0_18px_45px_rgba(24,22,32,0.16)]"
        >
          {options.length ? (
            options.map((option) => {
              const selected = values.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() =>
                    onChange(
                      selected
                        ? values.filter((value) => value !== option.value)
                        : [...values, option.value],
                    )
                  }
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-[#f7f7f8]"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded border border-border">
                    {selected && <Check size={14} weight="bold" />}
                  </span>
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })
          ) : (
            <p className="px-4 py-3 text-sm text-muted">No options available</p>
          )}
          {menuFooter && <div className="mt-2 border-t border-border pt-2">{menuFooter}</div>}
        </div>
      )}
    </div>
  );
}
