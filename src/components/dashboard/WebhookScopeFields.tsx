"use client";

import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import { outboundWebhookEventOptions } from "@/lib/outbound-webhook-events.config";
import type { OutboundWebhookEventName } from "@/lib/outbound-webhooks.types";
import type { WebhookScopeFieldsProps } from "./WebhookScopeFields.types";

function AllToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange(checked: boolean): void;
}) {
  return (
    <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="h-4 w-4 accent-[#f5b942]"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

export function WebhookScopeFields({
  values,
  productOptions,
  onChange,
}: WebhookScopeFieldsProps) {
  return (
    <>
      <div>
        <p className="text-sm font-medium">Products</p>
        <AllToggle
          checked={values.allProducts}
          label="All products (including new ones)"
          onChange={(allProducts) => onChange({ ...values, allProducts })}
        />
        {!values.allProducts && (
          <div className="mt-2">
            <MultiSelectDropdown
              label="Selected products"
              name="productIds"
              values={values.productIds}
              options={productOptions}
              placeholder="Select products"
              onChange={(productIds) => onChange({ ...values, productIds })}
            />
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium">Events</p>
        <AllToggle
          checked={values.allEvents}
          label="All events (including future ones)"
          onChange={(allEvents) => onChange({ ...values, allEvents })}
        />
        {!values.allEvents && (
          <div className="mt-2">
            <MultiSelectDropdown
              label="Selected events"
              name="events"
              values={values.events}
              options={outboundWebhookEventOptions.map((eventOption) => ({
                value: eventOption.name,
                label: eventOption.label,
              }))}
              placeholder="Select events"
              onChange={(events) =>
                onChange({
                  ...values,
                  events: events as Exclude<
                    OutboundWebhookEventName,
                    "webhook_test"
                  >[],
                })
              }
            />
          </div>
        )}
      </div>
    </>
  );
}
