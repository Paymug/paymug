"use client";

import { Select } from "@/components/ui";
import { inputClass, labelClass } from "@/components/ui.styles";
import type { DiscountValueInputProps } from "./DiscountValueInput.types";

export function DiscountValueInput({
  type,
  value,
  typeOptions,
  onTypeChange,
  onValueChange,
}: DiscountValueInputProps) {
  return (
    <div>
      <label className={labelClass} htmlFor="discountValue">
        Discount
      </label>
      <div className="flex">
        <Select
          name="type"
          value={type || "percent"}
          options={typeOptions}
          onValueChange={onTypeChange}
          ariaLabel="Discount type"
          className="w-40 shrink-0"
          triggerClassName="!rounded-r-none"
        />
        <input
          id="discountValue"
          name="value"
          type="number"
          min="0"
          max={type === "percent" ? "100" : undefined}
          step="0.01"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={type === "percent" ? "10" : "5.00"}
          required
          className={`${inputClass} !rounded-l-none !border-l-0`}
        />
      </div>
    </div>
  );
}
