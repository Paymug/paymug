"use client";

import { Desktop, Trash } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCustomerPortalDateTime } from "./customer-portal.utils";
import { deleteCustomerLicenseActivation } from "./CustomerLicenseActivations.utils";
import type { CustomerLicenseActivationsProps } from "./CustomerLicenseActivations.types";

export function CustomerLicenseActivations({
  orderId,
  seatLimit,
  initialActivations,
}: CustomerLicenseActivationsProps) {
  const router = useRouter();
  const [activations, setActivations] = useState(initialActivations);
  const [removingId, setRemovingId] = useState<string>();
  const [error, setError] = useState<string>();

  return (
    <div className="mt-4 border-t border-[#e8e8ee] pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Active devices</p>
          <p className="mt-0.5 text-xs text-[#85859d]">
            {seatLimit === null
              ? `${activations.length} active · Unlimited seats`
              : `${activations.length} of ${seatLimit} seats used`}
          </p>
        </div>
      </div>

      {activations.length ? (
        <div className="mt-3 space-y-2">
          {activations.map((activation) => (
            <div
              key={activation.instanceId}
              className="flex items-start gap-3 rounded-lg bg-[#f7f7f8] p-3"
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[#77778a]">
                <Desktop size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {activation.instanceUrl}
                </p>
                <p className="mt-0.5 text-xs text-[#85859d]">
                  Version {activation.appVersion} · Last active {" "}
                  {formatCustomerPortalDateTime(activation.lastSeenAt)}
                </p>
                <p className="mt-1 truncate font-mono text-[11px] text-[#a0a0b2]">
                  {activation.instanceId}
                </p>
              </div>
              <button
                type="button"
                disabled={removingId === activation.instanceId}
                onClick={() => {
                  if (
                    !window.confirm(
                      "Remove this device? Its next license validation will fail.",
                    )
                  ) {
                    return;
                  }
                  setRemovingId(activation.instanceId);
                  setError(undefined);
                  void deleteCustomerLicenseActivation(
                    orderId,
                    activation.instanceId,
                  )
                    .then((nextActivations) => {
                      setActivations(nextActivations);
                      router.refresh();
                    })
                    .catch((reason: unknown) => {
                      setError(
                        reason instanceof Error
                          ? reason.message
                          : "Could not remove device",
                      );
                    })
                    .finally(() => setRemovingId(undefined));
                }}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#85859d] transition hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-50"
                aria-label={`Remove device ${activation.instanceUrl}`}
                title="Remove device"
              >
                <Trash size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-[#f7f7f8] px-3 py-2.5 text-xs text-[#85859d]">
          No active devices.
        </p>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <p className="mt-3 text-xs leading-5 text-[#85859d]">
        Removing a device signs it out of this license. Its next validation will
        fail until it is activated again.
      </p>
    </div>
  );
}
