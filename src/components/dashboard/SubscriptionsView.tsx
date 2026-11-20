"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUpRight01Icon,
  Delete02Icon,
  PencilEdit01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { useMemo, useState } from "react";
import { CustomerAvatar } from "@/components/CustomerAvatar";
import { CustomSelect } from "@/components/CustomSelect";
import { AreaChart } from "@/components/dashboard/charts";
import { useTimeZone } from "@/components/dashboard/TimeZoneProvider";
import { getGravatarUrl } from "@/lib/customer-avatar";
import { formatInTimeZone } from "@/lib/timezone";
import { dashboardCardClass, dashboardIconButtonClass } from "./dashboard.styles";
import {
  buildSubscriptionSeries,
  buildSubscriptionsCsv,
  formatDayKey,
  formatSubscriptionRevenue,
  getSubscriptionCustomerName,
  getSubscriptionOrderLabel,
  getSubscriptionRange,
  getSubscriptionStats,
  getSubscriptionStatusStyle,
  intervalOptions,
  rangePresetOptions,
  type SubscriptionInterval,
  type SubscriptionMetric,
  type SubscriptionRangePreset,
} from "./subscriptions-view.utils";
import type { SubscriptionsViewProps } from "./SubscriptionsView.types";

const statusFilterOptions = [
  { value: "all", label: "All Subscriptions" },
  { value: "active", label: "Active" },
  { value: "trialing", label: "Trialing" },
  { value: "approval_pending", label: "Approval pending" },
  { value: "past_due", label: "Past due" },
  { value: "paused", label: "Paused" },
  { value: "suspended", label: "Suspended" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];

export function SubscriptionsView({
  records,
  onEdit,
  onDelete,
}: SubscriptionsViewProps) {
  const timeZone = useTimeZone();
  const [preset, setPreset] = useState<SubscriptionRangePreset>("30");
  const [interval, setInterval] = useState<SubscriptionInterval>("daily");
  const [metric, setMetric] = useState<SubscriptionMetric>("total");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const range = useMemo(
    () => getSubscriptionRange(preset, records, timeZone),
    [preset, records, timeZone],
  );
  const stats = useMemo(
    () => getSubscriptionStats(records, range, timeZone),
    [records, range, timeZone],
  );
  const series = useMemo(
    () => buildSubscriptionSeries(records, range, interval, metric, timeZone),
    [records, range, interval, metric, timeZone],
  );

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return records
      .filter((record) => status === "all" || record.status === status)
      .filter(
        (record) =>
          !needle ||
          [record.title, record.subtitle, getSubscriptionCustomerName(record)]
            .join(" ")
            .toLowerCase()
            .includes(needle),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [records, query, status]);

  function exportCsv() {
    const blob = new Blob([buildSubscriptionsCsv(rows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "subscriptions.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const tiles: Array<{ key: SubscriptionMetric; value: string; label: string }> = [
    { key: "total", value: String(stats.total), label: "Total subscriptions" },
    { key: "new", value: String(stats.created), label: "New subscriptions" },
    { key: "active", value: String(stats.active), label: "Active subscriptions" },
    {
      key: "churn",
      value: `${Math.round(stats.churnRate * 10) / 10}%`,
      label: "Subscription churn rate",
    },
  ];

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-6">
          <CustomSelect
            value={preset}
            onValueChange={(value) => setPreset(value as SubscriptionRangePreset)}
            options={rangePresetOptions.map((option) => ({
              value: option.value,
              label:
                option.value === preset
                  ? `${formatDayKey(range.startKey, true)} — ${formatDayKey(range.endKey, true)}`
                  : option.label,
            }))}
            variant="plain"
            ariaLabel="Date range"
            triggerClassName="text-sm"
          />
          <CustomSelect
            value={interval}
            onValueChange={(value) => setInterval(value as SubscriptionInterval)}
            options={intervalOptions}
            variant="plain"
            ariaLabel="Chart interval"
            triggerClassName="text-sm"
          />
        </div>
        <div className="flex items-center gap-5 text-sm text-muted">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-[#f5c518]" />
            Chosen Period
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-[#a3a3ad]" />
            Last Period
          </span>
        </div>
      </div>

      <div className="mt-5">
        <AreaChart
          data={series.data}
          comparisonData={series.comparisonData}
          height={220}
          color="#f5c518"
          comparisonColor="#a3a3ad"
          fillOpacity={0.025}
          showAxis={false}
          valueFormat="number"
          emptyLabel=""
          title={tiles.find((tile) => tile.key === metric)?.label}
        />
        <div className="mt-2 flex justify-between text-sm text-muted">
          <span>{formatDayKey(range.startKey)}</span>
          <span>{formatDayKey(range.endKey)}</span>
        </div>
      </div>

      <div
        className={`${dashboardCardClass} mt-6 grid grid-cols-2 overflow-hidden lg:grid-cols-4`}
      >
        {tiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            onClick={() => setMetric(tile.key)}
            aria-pressed={metric === tile.key}
            className={`cursor-pointer border-t-2 border-r border-r-[#e8e8ee] px-7 py-6 text-left transition last:border-r-0 hover:bg-[#fafafd] ${
              metric === tile.key ? "border-t-accent" : "border-t-transparent"
            }`}
          >
            <p className="text-3xl font-medium tracking-[-0.03em] tabular-nums text-[#27272f]">
              {tile.value}
            </p>
            <p className="mt-2 text-sm text-muted">{tile.label}</p>
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <label className="relative flex min-w-56 flex-1 items-center">
          <HugeiconsIcon
            icon={Search01Icon}
            size={18}
            className="pointer-events-none absolute left-0 text-[#9191aa]"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search subscriptions by product, name or email…"
            aria-label="Search subscriptions"
            className="w-full border-0 bg-transparent py-2 pl-8 text-sm text-[#27272f] outline-none placeholder:text-[#9191aa]"
          />
        </label>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5 text-sm text-muted">
            <span>Status:</span>
            <CustomSelect
              value={status}
              onValueChange={setStatus}
              options={statusFilterOptions}
              variant="plain"
              ariaLabel="Filter by status"
              triggerClassName="text-sm text-[#27272f]"
            />
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[#3a3a45] transition hover:text-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} aria-hidden />
            Export
          </button>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto border-t border-border">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="py-3 pr-4 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 text-right font-medium">Revenue</th>
              <th className="w-24 py-3 pl-4 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted">
                  No subscriptions match your filters.
                </td>
              </tr>
            ) : (
              rows.map((record) => {
                const style = getSubscriptionStatusStyle(record.status);
                const name = getSubscriptionCustomerName(record);
                const email = record.subtitle || "";
                return (
                  <tr
                    key={record.id}
                    className="group border-b border-border last:border-0"
                  >
                    <td className="py-4 pr-4 tabular-nums">
                      {getSubscriptionOrderLabel(record)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {formatInTimeZone(record.createdAt, timeZone, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-lg px-2.5 py-1 text-sm font-medium ${style.className}`}
                      >
                        {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        <CustomerAvatar
                          name={name}
                          email={email}
                          avatarUrl={email ? getGravatarUrl(email, 64) : undefined}
                          size="sm"
                        />
                        <span className="max-w-48 truncate" title={email}>
                          {name || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="max-w-56 truncate px-4 py-4">{record.title}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">
                      {formatSubscriptionRevenue(record)}
                    </td>
                    <td className="py-4 pl-4">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className={`${dashboardIconButtonClass} !h-8 !w-8`}
                          onClick={() => onEdit(record)}
                          aria-label={`Edit ${record.title}`}
                        >
                          <HugeiconsIcon icon={PencilEdit01Icon} size={15} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className={`${dashboardIconButtonClass} !h-8 !w-8 hover:!text-red-500`}
                          onClick={() => onDelete(record)}
                          aria-label={`Delete ${record.title}`}
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={15} aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
