"use client";

import { Minus, Plus } from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { extraSeatsCustomKey, maxExtraSeats } from "@/lib/extra-seats";
import type { ExtraSeatsPickerProps } from "./ExtraSeatsPicker.types";

const buttonClass =
  "grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full text-muted transition bg-[#f0f0f5] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

export function ExtraSeatsPicker({ extraSeats }: ExtraSeatsPickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState(String(extraSeats));

  function commit(value: number) {
    const next = Math.min(maxExtraSeats, Math.max(0, Math.floor(value) || 0));
    setDraft(String(next));
    if (next === extraSeats) return;
    const params = new URLSearchParams(searchParams.toString());
    const queryKey = `[custom][${extraSeatsCustomKey}]`;
    if (next > 0) params.set(queryKey, String(next));
    else params.delete(queryKey);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-1">

      <label htmlFor="extra-seats" className="text-muted">
        Extra seats
      </label>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Remove an extra seat"
          className={buttonClass}
          disabled={extraSeats <= 0}
          onClick={() => commit(extraSeats - 1)}
        >
          <Minus size={14} weight="bold" />
        </button>
        <input
          id="extra-seats"
          aria-label="Extra seats"
          type="number"
          inputMode="numeric"
          min={0}
          max={maxExtraSeats}
          step={1}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit(Number(draft))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit(Number(draft));
            }
          }}
          className="h-7 w-5 bg-transparent text-center text-sm font-medium outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          aria-label="Add an extra seat"
          className={buttonClass}
          disabled={extraSeats >= maxExtraSeats}
          onClick={() => commit(extraSeats + 1)}
        >
          <Plus size={14} weight="bold" />
        </button>
      </div>
    </div>
  );
}
