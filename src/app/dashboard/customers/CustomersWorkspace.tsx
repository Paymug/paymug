"use client";

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

export function CustomersWorkspace({
  customers,
  range,
}: CustomersWorkspaceProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary>();
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
          <table className="w-full min-w-[1160px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-sm text-muted">
                <th className="px-4 py-3 font-medium">First seen</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Source site</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Subscriptions</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">MRR</th>
                <th className="px-4 py-3 font-medium">Revenue</th>
                <th className="w-16 px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.email}
                  onClick={() => setSelectedCustomer(customer)}
                  className="cursor-pointer border-b border-border transition last:border-0 hover:bg-[#fafafd]"
                >
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted">
                    {formatCustomerDate(customer.firstSeen)}
                  </td>
                  <td className="px-4 py-3">
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
                  <td className="max-w-[12rem] truncate px-4 py-3" title={customer.source}>
                    {customer.source ?? "—"}
                  </td>
                  <td className="max-w-[9rem] truncate px-4 py-3" title={customer.city}>
                    {customer.city ?? "—"}
                  </td>
                  <td className="max-w-[9rem] truncate px-4 py-3" title={customer.country}>
                    {customer.country ?? "—"}
                  </td>
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
                  <td className="px-4 py-3 tabular-nums">
                    {customer.subscriptionsCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {customer.ordersCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatMoney(customer.mrr, customer.currency)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatMoney(customer.revenue, customer.currency)}
                  </td>
                  <td
                    className="px-4 py-3 text-right"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <CustomerActionsMenu
                      customer={customer}
                      onView={() => setSelectedCustomer(customer)}
                    />
                  </td>
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
