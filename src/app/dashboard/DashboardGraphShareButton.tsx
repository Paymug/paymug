"use client";

import { ShareFatIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { DashboardGraphShareModal } from "./DashboardGraphShareModal";
import type { DashboardGraphShareButtonProps } from "./dashboard-graph-share.types";

export function DashboardGraphShareButton({
  metric,
  currency,
  className = "",
}: DashboardGraphShareButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`pointer-events-none absolute z-20 grid h-6 w-6 place-items-center rounded-full bg-gray-500/40 text-white opacity-0 transition hover:bg-accent focus:pointer-events-auto focus:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 ${className}`}
        aria-label={`Share ${metric.label} graph`}
      >
        <ShareFatIcon size={12} weight="bold" aria-hidden />
      </button>
      {open && (
        <DashboardGraphShareModal
          metric={metric}
          currency={currency}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
