"use client";

import { useState } from "react";
import { CustomerAvatar } from "@/components/CustomerAvatar";
import { dashboardCardClass } from "@/components/dashboard/dashboard.styles";
import {
  badgeBaseClass,
  badgeVariantClasses,
} from "@/components/ui.styles";
import { formatCustomerDate } from "../customers/customers.utils";
import { LicenseDetailsDrawer } from "./LicenseDetailsDrawer";
import type { LicenseRow, LicensesWorkspaceProps } from "./licenses.types";

function statusVariant(
  status: string,
): keyof typeof badgeVariantClasses {
  if (status === "active") return "success";
  if (status === "revoked") return "danger";
  return "muted";
}

export function LicensesWorkspace({
  licenses,
  summary,
}: LicensesWorkspaceProps) {
  const [rows, setRows] = useState(licenses);
  const [selected, setSelected] = useState<LicenseRow>();

  const stats = [
    { label: "Total licenses", value: summary.totalLicenses.toLocaleString() },
    {
      label: "Total activations",
      value: summary.totalActivations.toLocaleString(),
    },
    {
      label: "New activations",
      value: summary.newActivations.toLocaleString(),
    },
  ];

  function updateRow(updated: LicenseRow) {
    setRows((current) =>
      current.map((row) => (row.id === updated.id ? updated : row)),
    );
  }

  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className={`${dashboardCardClass} px-5 py-4`}>
            <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
            <p className="mt-1 text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className={`${dashboardCardClass} mt-6 px-6 py-14 text-center`}>
          <p className="text-sm font-medium">No licenses yet</p>
          <p className="mt-1 text-sm text-muted">
            License keys are created automatically when a licensed product is
            purchased.
          </p>
        </div>
      ) : (
        <div className={`${dashboardCardClass} mt-6 overflow-x-auto`}>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-sm text-muted">
                <th className="px-4 py-3 font-medium">License</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Expiry</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Product</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((license) => (
                <tr
                  key={license.id}
                  onClick={() => setSelected(license)}
                  className="cursor-pointer border-b border-border transition last:border-0 hover:bg-[#fafafd]"
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    {license.maskedKey}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`${badgeBaseClass} capitalize ${
                        badgeVariantClasses[statusVariant(license.status)]
                      }`}
                    >
                      {license.status} ({license.activeSeats}/
                      {license.seatLimit ?? "∞"})
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                    {license.expiry
                      ? formatCustomerDate(license.expiry)
                      : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <CustomerAvatar
                        name={license.customerName}
                        email={license.customerEmail}
                        avatarUrl={license.customerAvatarUrl}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {license.customerName}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {license.customerEmail}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{license.product}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <LicenseDetailsDrawer
          license={selected}
          onClose={() => setSelected(undefined)}
          onUpdated={(updated) => {
            updateRow(updated);
            setSelected(updated);
          }}
        />
      )}
    </>
  );
}
