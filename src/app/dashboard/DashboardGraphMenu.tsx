"use client";

import {
  ArrowCounterClockwise,
  Check,
  DotsThree,
  Plus,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { DashboardGraphMenuProps } from "./dashboard-overview.types";

export function DashboardGraphMenu({
  availableMetrics,
  showAccumulatedValues,
  onAddGraph,
  onResetGraphs,
  onShowAccumulatedValuesChange,
}: DashboardGraphMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [showAddGraphs, setShowAddGraphs] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeMenu = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setShowAddGraphs(false);
        }}
        className="grid h-9 w-9 place-items-center rounded-xl text-[#74748f] transition hover:bg-[#f7f7f8] hover:text-[#333]"
        aria-label="Graph options"
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
          className="absolute right-0 top-[calc(100%+0.55rem)] z-70 w-64 overflow-hidden rounded-xl border border-[#d7e0ea] bg-white py-2 shadow-[0_20px_45px_rgba(28,39,55,0.18)]"
        >
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={showAccumulatedValues}
            onClick={() =>
              onShowAccumulatedValuesChange(!showAccumulatedValues)
            }
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-[#f7f7f8]"
          >
            <span className="grid w-4 place-items-center">
              {showAccumulatedValues && (
                <Check size={15} weight="bold" aria-hidden />
              )}
            </span>
            Show accumulated values
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onResetGraphs();
              setOpen(false);
            }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-[#f7f7f8]"
          >
            <ArrowCounterClockwise size={16} aria-hidden />
            Reset graphs
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!availableMetrics.length}
            onClick={() => setShowAddGraphs((current) => !current)}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-[#f7f7f8] disabled:opacity-45"
          >
            <Plus size={16} weight="bold" aria-hidden />
            Add graph
          </button>
          {showAddGraphs && availableMetrics.length > 0 && (
            <div className="max-h-56 overflow-y-auto border-t border-[#e8e8ee] pt-1">
              {availableMetrics.map((metric) => (
                <button
                  key={metric.value}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onAddGraph(metric.value);
                    setOpen(false);
                  }}
                  className="w-full px-6 py-2 text-left text-sm text-[#5f5f73] transition hover:bg-[#f7f7f8] hover:text-[#333]"
                >
                  {metric.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
