"use client";

import { Check } from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatMoney } from "@/lib/format";
import {
  productBundleCustomKeyPrefix,
  productOptionCustomKey,
} from "@/lib/product-configurations";
import type { ProductConfigurationPickerProps } from "./ProductConfigurationPicker.types";

export function ProductConfigurationPicker({
  options,
  bundles,
  selectedOptionId,
  selectedBundleChoiceIds,
  currency,
}: ProductConfigurationPickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, values: string[]) {
    const next = new URLSearchParams(searchParams.toString());
    const queryKey = `[custom][${key}]`;
    if (values.length) next.set(queryKey, values.join(","));
    else next.delete(queryKey);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  if (!options.length && !bundles.length) return null;

  return (
    <div className="mb-6 space-y-5 rounded-xl border border-border bg-[#fafafd] p-4">
      {!!options.length && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Choose an option</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {options.map((option) => {
              const selected = option.id === selectedOptionId;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => update(productOptionCustomKey, [option.id])}
                  className={`rounded-xl border p-3 text-left transition ${
                    selected
                      ? "border-accent bg-accent-soft ring-1 ring-accent"
                      : "border-border bg-white hover:border-accent/50"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{option.name}</span>
                    {selected && <Check size={16} weight="bold" />}
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    {formatMoney(option.price, currency)}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {bundles.map((bundle) => {
        const selectedIds = selectedBundleChoiceIds[bundle.id] || [];
        return (
          <fieldset key={bundle.id}>
            <legend className="mb-2 text-sm font-semibold">
              {bundle.name}
              <span className="ml-2 font-normal text-muted">
                Optional · {bundle.selectionMode === "single" ? "choose one" : "choose any"}
              </span>
            </legend>
            <div className="space-y-2">
              {bundle.choices.map((choice) => {
                const selected = selectedIds.includes(choice.id);
                return (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => {
                      if (bundle.selectionMode === "single") {
                        update(
                          `${productBundleCustomKeyPrefix}${bundle.id}`,
                          selected ? [] : [choice.id],
                        );
                        return;
                      }
                      update(
                        `${productBundleCustomKeyPrefix}${bundle.id}`,
                        selected
                          ? selectedIds.filter((id) => id !== choice.id)
                          : [...selectedIds, choice.id],
                      );
                    }}
                    className={`flex w-full items-center justify-between gap-4 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                      selected
                        ? "border-accent bg-accent-soft"
                        : "border-border bg-white hover:border-accent/50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="grid h-5 w-5 place-items-center rounded border border-current">
                        {selected && <Check size={13} weight="bold" />}
                      </span>
                      {choice.name}
                    </span>
                    <span className="text-right font-medium">
                      +{formatMoney(choice.price, currency)}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
