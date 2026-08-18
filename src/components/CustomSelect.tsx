"use client";

import { CaretDown, Check } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";
import { labelClass } from "./ui.styles";
import {
  filterCustomSelectOptions,
  getCustomSelectOptionIndex,
  getNextCustomSelectOptionIndex,
} from "./custom-select.utils";
import type { CustomSelectProps } from "./CustomSelect.types";

export function CustomSelect({
  id,
  name,
  label,
  error,
  value,
  options,
  onValueChange,
  ariaLabel,
  required,
  disabled,
  className = "",
  triggerClassName = "",
  menuClassName = "",
  menuFooter,
  searchable = false,
  searchPlaceholder = "Search…",
  onOpenChange,
  variant = "field",
}: CustomSelectProps) {
  const generatedId = useId();
  const inputId = id || name || generatedId;
  const menuId = `${inputId}-menu`;
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const previousOpenRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(() =>
    getCustomSelectOptionIndex(options, value),
  );
  const selectedOption =
    options.find((option) => option.value === value) || options[0];
  const filteredOptions = filterCustomSelectOptions(options, searchQuery);

  useEffect(() => {
    setActiveIndex(getCustomSelectOptionIndex(options, value));
  }, [options, value]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  useEffect(() => {
    if (previousOpenRef.current === open) return;
    previousOpenRef.current = open;
    onOpenChange?.(open);
    if (!open) {
      setSearchQuery("");
      return;
    }
    if (searchable) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [onOpenChange, open, searchable]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label && (
        <label className={labelClass} htmlFor={inputId}>
          {label}
        </label>
      )}
      {name && <input type="hidden" name={name} value={value} readOnly />}
      <button
        id={inputId}
        type="button"
        role="combobox"
        disabled={disabled}
        aria-label={ariaLabel || label}
        aria-haspopup="listbox"
        aria-required={required}
        aria-expanded={open}
        aria-controls={menuId}
        aria-activedescendant={
          open && activeIndex >= 0
            ? `${menuId}-option-${activeIndex}`
            : undefined
        }
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) setOpen(true);
            setActiveIndex((current) =>
              getNextCustomSelectOptionIndex(
                options,
                current,
                event.key === "ArrowDown" ? 1 : -1,
              ),
            );
            return;
          }
          if ((event.key === "Enter" || event.key === " ") && open) {
            event.preventDefault();
            const option = options[activeIndex];
            if (option && !option.disabled) onValueChange(option.value);
            setOpen(false);
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          }
          if (event.key === "Tab") setOpen(false);
        }}
        className={`${
          variant === "field"
            ? "flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border bg-white px-3.5 py-2.5 text-left text-sm text-foreground outline-none transition focus:border-accent focus:ring-3 focus:ring-accent/20"
            : "inline-flex max-w-full items-center gap-2 bg-transparent py-1 text-left outline-none"
        } cursor-pointer disabled:cursor-not-allowed disabled:opacity-55 ${triggerClassName}`}
      >
        <span className="truncate">{selectedOption?.label || "Select"}</span>
        <CaretDown
          size={14}
          weight="bold"
          className={`shrink-0 text-[#656b78] transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 top-[calc(100%+0.65rem)] z-70 max-h-96 overflow-y-auto rounded-xl border border-[#d7e0ea] bg-white py-3 shadow-[0_20px_45px_rgba(28,39,55,0.18)] w-auto min-w-46 max-w-68 ${
            variant === "plain" ? "" : ""
          } ${menuClassName}`}
        >
          {searchable && (
            <div className="px-3 pb-2">
              <input
                ref={searchInputRef}
                type="search"
                role="searchbox"
                value={searchQuery}
                placeholder={searchPlaceholder}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setOpen(false);
                    return;
                  }
                  if (event.key === "Enter") {
                    event.preventDefault();
                    const option =
                      filteredOptions.find(
                        (candidate) =>
                          !candidate.disabled && Boolean(candidate.value),
                      ) || filteredOptions.find((candidate) => !candidate.disabled);
                    if (option) onValueChange(option.value);
                    if (option) setOpen(false);
                  }
                }}
                className="min-h-10 w-full rounded-lg border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          )}
          <div id={menuId} role="listbox" aria-label={ariaLabel || label}>
          {filteredOptions.map((option) => {
            const index = options.indexOf(option);
            const selected = option.value === value;
            const active = false; //index === activeIndex;
            return (
              <button
                id={`${menuId}-option-${index}`}
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 pr-4 pl-3 py-2.5  text-left text-sm leading-5 outline-none transition disabled:cursor-not-allowed disabled:opacity-45 ${
                  selected
                    ? "bg-accent-soft text-yellow-700"
                    : "text-[#20304] hover:bg-[#f7f7f8]"
                } 
                
                `}
              >
                <span className="grid w-4 shrink-0 place-items-center">
                  {selected && <Check size={14} weight="bold" aria-hidden />}
                </span>
                <span className="">{option.label}</span>
              </button>
            );
          })}
          {filteredOptions.length === 0 && (
            <p className="px-4 py-3 text-sm text-[#85859d]">
              No matching options
            </p>
          )}
          </div>
          {menuFooter && (
            <div className="mt-2 border-t border-[#e8e8ee] pt-2" role="presentation">
              {menuFooter}
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
