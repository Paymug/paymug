"use client";

import { Desktop, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { formatCustomerDateTime } from "./customers.utils";
import type { CustomerLicenseActivationsProps } from "./CustomerLicenseActivations.types";

export function CustomerLicenseActivations({
  licenseId,
  seatLimit,
  initialActivations,
}: CustomerLicenseActivationsProps) {
  const [activations, setActivations] = useState(initialActivations);
  const [removingId, setRemovingId] = useState<string>();
  const [error, setError] = useState<string>();

  async function removeActivation(instanceId: string) {
    if (
      !window.confirm(
        "Remove this device? Its next license validation will fail.",
      )
    ) {
      return;
    }
    setRemovingId(instanceId);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/licenses/${licenseId}/activations/${encodeURIComponent(instanceId)}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as {
        activations?: typeof activations;
        error?: string;
      };
      if (!response.ok || !data.activations) {
        throw new Error(data.error || "Could not remove device");
      }
      setActivations(data.activations);
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Could not remove device",
      );
    } finally {
      setRemovingId(undefined);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-[#ececf1] bg-[#fafafd] p-3">
      <p className="text-xs font-medium text-[#85859d]">
        {seatLimit === null
          ? `${activations.length} active · Unlimited seats`
          : `${activations.length} of ${seatLimit} seats used`}
      </p>

      {activations.length ? (
        <div className="mt-3 space-y-2">
          {activations.map((activation) => (
            <div
              key={activation.instanceId}
              className="flex items-start gap-3 rounded-lg bg-white p-3"
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f7f7f8] text-[#77778a]">
                <Desktop size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {activation.instanceUrl}
                </p>
                <p className="mt-0.5 text-xs text-[#85859d]">
                  Version {activation.appVersion} · Last active{" "}
                  {formatCustomerDateTime(activation.lastSeenAt)}
                </p>
                <p className="mt-1 truncate font-mono text-[11px] text-[#a0a0b2]">
                  {activation.instanceId}
                </p>
              </div>
              <button
                type="button"
                disabled={removingId === activation.instanceId}
                onClick={() => void removeActivation(activation.instanceId)}
                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-[#85859d] transition hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-50"
                aria-label={`Remove device ${activation.instanceUrl}`}
                title="Remove device"
              >
                <Trash size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-white px-3 py-2.5 text-xs text-[#85859d]">
          No active devices.
        </p>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
