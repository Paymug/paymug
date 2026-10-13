"use client";

import { Minus, Plus } from "@phosphor-icons/react";
import { useState } from "react";
import {
  calculateSeatAddOnPrice,
  maxExtraSeats,
} from "@/lib/extra-seats";
import { formatMoney } from "@/lib/format";
import type { CustomerSeatAddOnProps } from "./CustomerSeatAddOn.types";

const stepClass =
  "grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full bg-[#f0f0f5] text-[#696978] transition hover:text-[#333] disabled:cursor-not-allowed disabled:opacity-40";

export function CustomerSeatAddOn({
  currency,
  seatAddOn,
  onCheckout,
}: CustomerSeatAddOnProps) {
  const maxSeats = maxExtraSeats - seatAddOn.currentExtraSeats;
  const [seats, setSeats] = useState(1);
  const price = calculateSeatAddOnPrice(
    seatAddOn.tiers,
    seatAddOn.currentExtraSeats,
    seats,
  );

  function setClamped(value: number) {
    setSeats(Math.min(maxSeats, Math.max(1, Math.floor(value) || 1)));
  }

  return (
    // Full-width row at the bottom of the product card in the modal header.
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-[#e6e6ec] px-3.5 py-3 sm:px-4">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-sm font-semibold">{seatAddOn.label}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Remove an extra seat"
            className={stepClass}
            disabled={seats <= 1}
            onClick={() => setClamped(seats - 1)}
          >
            <Minus size={14} weight="bold" />
          </button>
          <input
            aria-label={seatAddOn.label}
            type="number"
            inputMode="numeric"
            min={1}
            max={maxSeats}
            value={seats}
            onChange={(event) => setClamped(Number(event.target.value))}
            className="h-7 w-10 bg-transparent text-center text-sm font-medium outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            aria-label="Add an extra seat"
            className={stepClass}
            disabled={seats >= maxSeats}
            onClick={() => setClamped(seats + 1)}
          >
            <Plus size={14} weight="bold" />
          </button>
          <span className="ml-1 text-sm font-medium">
            {formatMoney(price, currency)}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onCheckout(seats)}
        className="inline-flex h-10 shrink-0 items-center rounded-xl bg-[#333] px-5 text-sm font-semibold text-white transition hover:bg-[#1f1f26]"
      >
        Checkout
      </button>
    </div>
  );
}
