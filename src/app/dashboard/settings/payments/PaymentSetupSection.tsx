"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";

import { useState } from "react";
import type { PaymentSetupSectionProps } from "./page.types";

export function PaymentSetupSection({
  stepNumber,
  title,
  description,
  complete,
  defaultOpen = false,
  children,
}: PaymentSetupSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border-b border-[#f0f0f4] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full flex-col gap-4 px-5 py-5 text-left transition hover:bg-[#fcfcfd] sm:flex-row sm:items-center sm:px-6"
        aria-expanded={open}
      >
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold transition ${
            complete
              ? "bg-[#e8f8ef] text-[#178f55]"
              : "bg-[#f7f7f8] text-[#85859d]"
          }`}
          role="checkbox"
          aria-checked={complete}
          aria-label={complete ? `${title} complete` : `${title} incomplete`}
        >
          {complete ? (
            <HugeiconsIcon icon={Tick02Icon} size={18} aria-hidden strokeWidth={2} />
          ) : (
            stepNumber
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-medium text-[#333]">
            {title}
          </span>
          <span className="mt-1 block text-sm leading-relaxed text-[#85859d]">
            {description}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <span
            className={`inline-flex min-w-24 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm ${
              complete
                ? "bg-[#e8f8ef] font-semibold text-[#178f55]"
                : "bg-[#f7f7f8] font-medium text-[#85859d]"
            }`}
          >
            {complete && <HugeiconsIcon icon={Tick02Icon} size={15} aria-hidden strokeWidth={2} />}
            {complete ? "Complete" : "Pending"}
          </span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={17}
            className={`shrink-0 text-[#85859d] transition-transform ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden strokeWidth={2}
          />
        </span>
      </button>

      <div
        className={`${
          open ? "block" : "hidden"
        } border-t border-[#f0f0f4] bg-[#fcfcfd] px-5 py-5 sm:px-6`}
      >
        {children}
      </div>
    </section>
  );
}
