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
import {
  dashboardCardClass,
  dashboardPageCopyClass,
} from "@/components/dashboard/dashboard.styles";
import {
  badgeBaseClass,
  badgeVariantClasses,
} from "@/components/ui.styles";
import { formatMoney } from "@/lib/format";
import { CustomerActionsMenu } from "./CustomerActionsMenu";
import { CustomerDetailsDrawer } from "./CustomerDetailsDrawer";
import { formatCustomerDate } from "./customers.utils";
import type {
  CustomerSummary,
  CustomersWorkspaceProps,
} from "./customers.types";

const customerColumns: DataTableColumn[] = [
  { id: "firstSeen", label: "First seen", width: 130 },
  { id: "name", label: "Name", width: 200 },
  { id: "source", label: "Source", width: 160 },
  { id: "city", label: "City", width: 130 },
  { id: "country", label: "Country", width: 130 },
  { id: "status", label: "Status", width: 120 },
  { id: "subscriptions", label: "Subscriptions", width: 140 },
  { id: "orders", label: "Orders", width: 90 },
  { id: "mrr", label: "MRR", width: 110 },
  { id: "revenue", label: "Revenue", width: 120 },
];

export function CustomersWorkspace({
  customers,
  range,
}: CustomersWorkspaceProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary>();
  const table = useDataTable("customers", customerColumns);
  const totalCustomers = customers.length;
  const newCustomers = customers.filter((customer) => {
    const firstSeen = customer.firstSeen.slice(0, 10);
    return firstSeen >= range.startDate && firstSeen <= range.endDate;
  }).length;
  const returningCustomers = customers.filter(
    (customer) => customer.isReturning,
  ).length;
  const returnRate =
    totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;
  const stats = [
    { label: "Total customers", value: totalCustomers.toLocaleString() },
    { label: "New customers", value: newCustomers.toLocaleString() },
    {
      label: "Return customer rate",
      value: `${returnRate.toFixed(1)}%`,
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="sr-only">Customers</h1>
          <p className={dashboardPageCopyClass}>
            The people who purchase from your store.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className={`${dashboardCardClass} px-5 py-4`}>
            <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
            <p className="mt-1 text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {customers.length === 0 ? (
        <div className={`${dashboardCardClass} mt-6 px-6 py-14 text-center`}>
          <p className="text-sm font-medium">No customers yet</p>
          <p className="mt-1 text-sm text-muted">
            Customer profiles appear automatically after the first purchase.
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
              {customers.map((customer) => (
                <tr
                  key={customer.email}
                  onClick={() => setSelectedCustomer(customer)}
                  className="group/row cursor-pointer border-b border-border transition last:border-0 hover:bg-[#fafafd]"
                >
                  {table.isVisible("firstSeen") && (
                  <td className="truncate px-4 py-3 tabular-nums text-muted">
                    {formatCustomerDate(customer.firstSeen)}
                  </td>
                  )}
                  {table.isVisible("name") && (
                  <td className="overflow-hidden px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <CustomerAvatar
                        name={customer.name}
                        email={customer.email}
                        avatarUrl={customer.avatarUrl}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{customer.name}</p>
                        <p className="truncate text-xs text-muted">
                          {customer.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  )}
                  {table.isVisible("source") && (
                  <td className="truncate px-4 py-3" title={customer.source}>
                    {customer.source ?? "—"}
                  </td>
                  )}
                  {table.isVisible("city") && (
                  <td className="truncate px-4 py-3" title={customer.city}>
                    {customer.city ?? "—"}
                  </td>
                  )}
                  {table.isVisible("country") && (
                  <td className="truncate px-4 py-3" title={customer.country}>
                    {customer.country ?? "—"}
                  </td>
                  )}
                  {table.isVisible("status") && (
                  <td className="px-4 py-3">
                    <span
                      className={`${badgeBaseClass} ${
                        customer.emailStatus === "subscribed"
                          ? badgeVariantClasses.success
                          : badgeVariantClasses.muted
                      }`}
                    >
                      {customer.emailStatus}
                    </span>
                  </td>
                  )}
                  {table.isVisible("subscriptions") && (
                  <td className="truncate px-4 py-3 tabular-nums">
                    {customer.subscriptionsCount.toLocaleString()}
                  </td>
                  )}
                  {table.isVisible("orders") && (
                  <td className="truncate px-4 py-3 tabular-nums">
                    {customer.ordersCount.toLocaleString()}
                  </td>
                  )}
                  {table.isVisible("mrr") && (
                  <td className="truncate px-4 py-3 tabular-nums">
                    {formatMoney(customer.mrr, customer.currency)}
                  </td>
                  )}
                  {table.isVisible("revenue") && (
                  <td className="truncate px-4 py-3 tabular-nums">
                    {formatMoney(customer.revenue, customer.currency)}
                  </td>
                  )}
                  <DataTableSettingsCell>
                    <span
                      className="inline-block"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <CustomerActionsMenu
                        customer={customer}
                        onView={() => setSelectedCustomer(customer)}
                      />
                    </span>
                  </DataTableSettingsCell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedCustomer && (
        <CustomerDetailsDrawer
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(undefined)}
        />
      )}
    </>
  );
}
