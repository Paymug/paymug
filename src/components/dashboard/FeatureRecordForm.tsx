"use client";

import { X } from "@phosphor-icons/react";
import { Alert, Button, Input, Select, Textarea } from "@/components/ui";
import { FeatureMultiSelect } from "./FeatureMultiSelect";
import { DiscountValueInput } from "./DiscountValueInput";
import {
  dashboardCardClass,
  dashboardIconButtonClass,
} from "./dashboard.styles";
import type { FeatureRecordFormProps } from "./FeatureRecordForm.types";

export function FeatureRecordForm({
  feature,
  values,
  productOptions,
  editing,
  saving,
  error,
  inline = false,
  layout = "grid",
  footerStart,
  showCancel = true,
  onSubmit,
  onClose,
  onValueChange,
}: FeatureRecordFormProps) {
  const stacked = layout === "stack";

  return (
    <form
      onSubmit={onSubmit}
      className={
        stacked
          ? "flex flex-col gap-4"
          : `grid gap-4 sm:grid-cols-2 ${
              inline ? `${dashboardCardClass} mb-4 mt-3 p-5` : ""
            }`
      }
    >
      {inline && (
        <div className="flex items-center justify-between sm:col-span-2">
          <h2 className="text-sm font-semibold">
            {editing ? `Edit ${feature.title}` : feature.createLabel}
          </h2>
          <button
            type="button"
            className={`${dashboardIconButtonClass} !h-8 !w-8`}
            onClick={onClose}
            aria-label="Close form"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      )}

      {feature.fields.map((field) => {
        if (feature.key === "discounts" && field.name === "value") {
          return null;
        }
        if (feature.key === "discounts" && field.name === "type") {
          return (
            <DiscountValueInput
              key="discount-value"
              type={values.type || "percent"}
              value={values.value || ""}
              typeOptions={field.options || []}
              onTypeChange={(value) => onValueChange("type", value)}
              onValueChange={(value) => onValueChange("value", value)}
            />
          );
        }
        const commonProps = {
          label: field.label,
          name: field.name,
          value: values[field.name] || "",
          required: field.required,
          onChange: (
            event: React.ChangeEvent<
              HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
            >
          ) => onValueChange(field.name, event.target.value),
        };

        if (field.type === "select") {
          return (
            <Select
              key={field.name}
              label={field.label}
              name={field.name}
              value={values[field.name] || ""}
              required={field.required}
              options={[
                ...(field.options || []),
                ...(field.optionsSource === "products" ? productOptions : []),
              ]}
              onValueChange={(value) => onValueChange(field.name, value)}
            />
          );
        }

        if (field.type === "multi-select") {
          return (
            <FeatureMultiSelect
              key={field.name}
              label={field.label}
              name={field.name}
              value={values[field.name] || "all"}
              options={[
                ...(field.options || []),
                ...(field.optionsSource === "products" ? productOptions : []),
              ]}
              onChange={(value) => onValueChange(field.name, value)}
            />
          );
        }

        if (field.type === "textarea") {
          return (
            <Textarea
              key={field.name}
              {...commonProps}
              className={stacked ? undefined : "sm:col-span-2"}
              placeholder={field.placeholder}
            />
          );
        }

        return (
          <Input
            key={field.name}
            {...commonProps}
            type={field.type}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            step={
              field.step ?? (field.type === "number" ? 0.01 : undefined)
            }
          />
        );
      })}

      {error && (
        <div className={stacked ? undefined : "sm:col-span-2"}>
          <Alert>{error}</Alert>
        </div>
      )}

      <div
        className={
          stacked
            ? `mt-2 flex items-center gap-3 border-t border-[#f0f0f4] pt-4 ${
                footerStart || (showCancel && !inline)
                  ? "justify-between"
                  : "justify-end"
              }`
            : `flex gap-2 sm:col-span-2 ${
                inline
                  ? ""
                  : "-mx-5 -mb-5 mt-2 justify-end border-t border-[#ededf2] px-5 pt-4 sm:-mx-6 sm:-mb-6 sm:px-6"
              }`
        }
      >
        {(footerStart || (!inline && showCancel)) && (
          <div className="flex items-center gap-2">
            {footerStart}
            {!inline && showCancel && (
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={saving}>
            {saving
              ? "Saving…"
              : editing
                ? "Save changes"
                : feature.createLabel}
          </Button>
          {inline && showCancel && (
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
