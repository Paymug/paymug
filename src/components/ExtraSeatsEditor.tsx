"use client";

import { Trash } from "@phosphor-icons/react";
import { Fragment } from "react";
import { formatMoney } from "@/lib/format";
import {
  maxExtraSeatTiers,
  maxExtraSeats,
  normalizeExtraSeatTiers,
} from "@/lib/extra-seats";
import type { ExtraSeatsEditorProps } from "./ExtraSeatsEditor.types";
import { FormSwitch } from "./FormSwitch";
import { inputClass } from "./ui.styles";

function toCents(value: string) {
  return Math.max(0, Math.round((Number(value) || 0) * 100));
}

export function ExtraSeatsEditor({
  currency,
  enabled,
  tiers,
  onEnabledChange,
  onTiersChange,
}: ExtraSeatsEditorProps) {
  function updateTier(index: number, patch: Partial<(typeof tiers)[number]>) {
    onTiersChange(
      tiers.map((tier, tierIndex) =>
        tierIndex === index ? { ...tier, ...patch } : tier,
      ),
    );
  }

  function addTier() {
    const last = tiers[tiers.length - 1];
    onTiersChange([
      ...tiers,
      {
        from: Math.min(maxExtraSeats, (last?.from ?? 1) + 10),
        price: last?.price ?? 0,
      },
    ]);
  }

  function describeTier(index: number) {
    const tier = tiers[index];
    const next = tiers[index + 1];
    const range = next
      ? tier.from === next.from - 1
        ? `Seat ${tier.from}`
        : `Seats ${tier.from}–${next.from - 1}`
      : `Seats ${tier.from}+`;
    return `${range}: ${formatMoney(tier.price, currency)} each`;
  }

  return (
    <div className="space-y-4">
      <FormSwitch
        label="Sell extra seats"
        description="Buyers can add seats on top of the seat limit. Extra seat costs are added to the total."
        checked={enabled}
        onToggle={(checked) => {
          onEnabledChange(checked);
          if (checked && !tiers.length) onTiersChange([{ from: 1, price: 0 }]);
        }}
      />

      {enabled && (
        <div className="space-y-3">
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_2.25rem] items-center gap-x-3 gap-y-2">
            <span className="text-xs font-medium text-muted">From seat</span>
            <span className="text-xs font-medium text-muted">
              Price per seat
            </span>
            <span aria-hidden />

            {tiers.map((tier, index) => (
              <Fragment key={`${index}-${tiers.length}`}>
                {index === 0 ? (
                  <span className="px-1 text-sm font-medium">1</span>
                ) : (
                  <input
                    aria-label={`Tier ${index + 1} first seat`}
                    name={`extraSeatTierFrom${index}`}
                    type="number"
                    min="2"
                    max={String(maxExtraSeats)}
                    step="1"
                    defaultValue={tier.from}
                    onChange={(event) =>
                      updateTier(index, {
                        from: Math.min(
                          maxExtraSeats,
                          Math.max(2, Math.floor(Number(event.target.value)) || 2),
                        ),
                      })
                    }
                    onBlur={() => onTiersChange(normalizeExtraSeatTiers(tiers))}
                    className={inputClass}
                  />
                )}
                <input
                  aria-label={`Tier ${index + 1} price per seat`}
                  name={`extraSeatTierPrice${index}`}
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={(tier.price / 100).toFixed(2)}
                  onChange={(event) =>
                    updateTier(index, { price: toCents(event.target.value) })
                  }
                  className={inputClass}
                />
                {index > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      onTiersChange(tiers.filter((_, tierIndex) => tierIndex !== index))
                    }
                    className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remove tier ${index + 1}`}
                  >
                    <Trash size={17} />
                  </button>
                ) : (
                  <span aria-hidden />
                )}
              </Fragment>
            ))}
          </div>

          {tiers.length < maxExtraSeatTiers && (
            <button
              type="button"
              onClick={addTier}
              className="text-sm font-medium text-accent-dark hover:underline"
            >
              + Add tier
            </button>
          )}

          {tiers.length > 1 && (
            <ul className="space-y-0.5 border-t border-border pt-3 text-xs leading-5 text-muted">
              {tiers.map((tier, index) => (
                <li key={`${tier.from}-${index}`}>{describeTier(index)}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
