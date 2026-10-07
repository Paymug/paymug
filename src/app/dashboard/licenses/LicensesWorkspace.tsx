"use client";

import {
  DataTableColgroup,
  DataTableHeadCell,
  DataTableSettingsCell,
  DataTableSettingsHeadCell,
} from "@/components/dashboard/data-table/DataTableParts";
import type { DataTableColumn } from "@/components/dashboard/data-table/data-table.types";
import { useDataTable } from "@/components/dashboard/data-table/use-data-table";
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

const licenseColumns: DataTableColumn[] = [
  { id: "license", label: "License", width: 200 },
  { id: "status", label: "Status", width: 170, minWidth: 150 },
  { id: "expiry", label: "Expiry", width: 130 },
  { id: "customer", label: "Customer", width: 200 },
  { id: "product", label: "Product", width: 200 },
];

export function LicensesWorkspace({
  licenses,
  summary,
}: LicensesWorkspaceProps) {
  const [rows, setRows] = useState(licenses);
  const [selected, setSelected] = useState<LicenseRow>();
  const table = useDataTable("licenses", licenseColumns);

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
          <table className="text-left text-sm" style={table.tableStyle}>
          <DataTableColgroup table={table} />
          <thead>
            <tr className="border-b border-border text-sm text-muted">
              {table.visibleColumns.map((column) => (
                <DataTableHeadCell
                  key={column.id}
                  table={table}
                  column={column}
                />
              ))}
              <DataTableSettingsHeadCell table={table} />
            </tr>
          </thead>
            <tbody>
              {rows.map((license) => (
                <tr
                  key={license.id}
                  onClick={() => setSelected(license)}
                  className="group/row cursor-pointer border-b border-border transition last:border-0 hover:bg-[#fafafd]"
                >
                  {table.isVisible("license") && (
                    <td
                      className="truncate px-4 py-3 font-mono text-xs"
                      title={license.maskedKey}
                    >
                      {license.maskedKey}
                    </td>
                  )}
                  {table.isVisible("status") && (
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`${badgeBaseClass} whitespace-nowrap capitalize ${
                          badgeVariantClasses[statusVariant(license.status)]
                        }`}
                      >
                        {license.status} ({license.activeSeats}/
                        {license.seatLimit ?? "∞"})
                      </span>
                    </td>
                  )}
                  {table.isVisible("expiry") && (
                    <td className="truncate px-4 py-3 tabular-nums">
                      {license.expiry
                        ? formatCustomerDate(license.expiry)
                        : "Never"}
                    </td>
                  )}
                  {table.isVisible("customer") && (
                    <td className="overflow-hidden px-4 py-3">
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
                  )}
                  {table.isVisible("product") && (
                    <td className="truncate px-4 py-3" title={license.product}>
                      {license.product}
                    </td>
                  )}
                  <DataTableSettingsCell />
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
