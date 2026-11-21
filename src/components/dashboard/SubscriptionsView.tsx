"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUpRight01Icon,
  PlusSignIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { useMemo, useState } from "react";
import { CustomerAvatar } from "@/components/CustomerAvatar";
import { CustomSelect } from "@/components/CustomSelect";
import { Button } from "@/components/ui";
import { StatusMultiFilter } from "./StatusMultiFilter";
import { AreaChart } from "@/components/dashboard/charts";
import { useTimeZone } from "@/components/dashboard/TimeZoneProvider";
import { getGravatarUrl } from "@/lib/customer-avatar";
import { RightDrawerModal } from "./RightDrawerModal";
import { dashboardCardClass } from "./dashboard.styles";
import {
  DataTableColgroup,
  DataTableHeadCell,
  DataTableSettingsCell,
  DataTableSettingsHeadCell,
} from "./data-table/DataTableParts";
import type { DataTableColumn } from "./data-table/data-table.types";
import { useDataTable } from "./data-table/use-data-table";
import { badgeBaseClass } from "@/components/ui.styles";
import {
  formatOrderDateTime,
  formatOrderListDate,
} from "@/app/dashboard/orders/orders.utils";
import type { FeatureRecord } from "@/lib/feature-records.types";
import type { ChartCommerceSeries } from "./charts.types";
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
  { value: "active", label: "Active" },
  { value: "trialing", label: "Trialing" },
  { value: "approval_pending", label: "Pending" },
  { value: "past_due", label: "Past due" },
  { value: "paused", label: "Paused" },
  { value: "suspended", label: "Suspended" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];

/** Statuses that get their own chart line when selected in the filter. */
const statusLines: Array<{ status: string; label: string; color: string }> = [
  { status: "active", label: "Active", color: "#179a58" },
  { status: "trialing", label: "Trial", color: "#c26a00" },
];

const subscriptionColumns: DataTableColumn[] = [
  { id: "date", label: "Date", width: 150 },
  { id: "status", label: "Status", width: 150 },
  { id: "customer", label: "Customer", width: 220 },
  { id: "product", label: "Product", width: 240 },
  { id: "revenue", label: "Revenue", width: 150, align: "right" },
];

export function SubscriptionsView({
  records,
  onCreate,
  createLabel = "Add subscription",
  onEdit,
  onDelete,
}: SubscriptionsViewProps) {
  const timeZone = useTimeZone();
  const [preset, setPreset] = useState<SubscriptionRangePreset>("30");
  const [interval, setInterval] = useState<SubscriptionInterval>("daily");
  const [metric, setMetric] = useState<SubscriptionMetric>("total");
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const table = useDataTable("subscriptions", subscriptionColumns);
  const selected = records.find((record) => record.id === selectedId) || null;

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

  const statusSeries = useMemo<ChartCommerceSeries[]>(
    () =>
      statusLines
        .filter((line) => statuses.includes(line.status))
        .map((line) => ({
          label: line.label,
          color: line.color,
          format: "number" as const,
          line: true,
          data: buildSubscriptionSeries(
            records.filter((record) => record.status === line.status),
            range,
            interval,
            metric,
            timeZone,
          ).data,
        })),
    [records, statuses, range, interval, metric, timeZone],
  );

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return records
      .filter(
        (record) =>
          statuses.length === 0 || statuses.includes(record.status),
      )
      .filter(
        (record) =>
          !needle ||
          [record.title, record.subtitle, getSubscriptionCustomerName(record)]
            .join(" ")
            .toLowerCase()
            .includes(needle),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [records, query, statuses]);

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
          {statusSeries.map((line) => (
            <span key={line.label} className="inline-flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full border-2"
                style={{ borderColor: line.color }}
              />
              {line.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <AreaChart
          data={series.data}
          comparisonData={series.comparisonData}
          height={220}
          color="#f5c518"
          comparisonColor="#a3a3ad"
          commerceSeries={statusSeries}
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
            <StatusMultiFilter
              values={statuses}
              onChange={setStatuses}
              options={statusFilterOptions}
              allLabel="All Subscriptions"
              ariaLabel="Filter by status"
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
          {onCreate && (
            <Button type="button" onClick={onCreate}>
              <HugeiconsIcon icon={PlusSignIcon} size={15} aria-hidden strokeWidth={2} />
              {createLabel}
            </Button>
          )}
        </div>
      </div>

      <div className={`${dashboardCardClass} mt-3 overflow-x-auto`}>
        <table className="text-left text-sm" style={table.tableStyle}>
          <DataTableColgroup table={table} />
          <thead>
            <tr className="border-b border-border text-sm text-muted">
              {table.visibleColumns.map((column) => (
                <DataTableHeadCell key={column.id} table={table} column={column} />
              ))}
              <DataTableSettingsHeadCell table={table} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.visibleColumns.length + 1}
                  className="py-12 text-center text-muted"
                >
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
                    className="group/row cursor-pointer border-b border-border transition last:border-0 hover:bg-[#fafafd]"
                    onClick={() => setSelectedId(record.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedId(record.id);
                      }
                    }}
                    tabIndex={0}
                  >
                    {table.isVisible("date") && (
                      <td className="truncate px-4 py-3 text-muted">
                        {formatOrderListDate(record.createdAt, timeZone)}
                      </td>
                    )}
                    {table.isVisible("status") && (
                      <td className="px-4 py-3">
                        <span className={`${badgeBaseClass} ${style.className}`}>
                          {style.label}
                        </span>
                      </td>
                    )}
                    {table.isVisible("customer") && (
                      <td className="overflow-hidden px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <CustomerAvatar
                            name={name}
                            email={email}
                            avatarUrl={email ? getGravatarUrl(email, 64) : undefined}
                            size="xs"
                          />
                          <span
                            className="truncate font-medium text-[#2a2a33]"
                            title={email}
                          >
                            {name || "—"}
                          </span>
                        </div>
                      </td>
                    )}
                    {table.isVisible("product") && (
                      <td className="truncate px-4 py-3" title={record.title}>
                        {record.title}
                      </td>
                    )}
                    {table.isVisible("revenue") && (
                      <td className="truncate px-4 py-3 text-right font-medium tabular-nums">
                        {formatSubscriptionRevenue(record)}
                      </td>
                    )}
                    <DataTableSettingsCell />
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <SubscriptionDetailDrawer
          record={selected}
          onClose={() => setSelectedId(null)}
          onEdit={(record) => {
            setSelectedId(null);
            onEdit(record);
          }}
          onDelete={(record) => {
            setSelectedId(null);
            onDelete(record);
          }}
        />
      )}
    </div>
  );
}

function SubscriptionDetailDrawer({
  record,
  onClose,
  onEdit,
  onDelete,
}: {
  record: FeatureRecord;
  onClose(): void;
  onEdit(record: FeatureRecord): void;
  onDelete(record: FeatureRecord): void;
}) {
  const timeZone = useTimeZone();
  const style = getSubscriptionStatusStyle(record.status);
  const name = getSubscriptionCustomerName(record);
  const email = record.subtitle || "";
  return (
    <RightDrawerModal
      eyebrow="Subscription"
      title={record.title}
      description={formatOrderDateTime(record.createdAt, timeZone)}
      onClose={onClose}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <span className={`${badgeBaseClass} ${style.className}`}>{style.label}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onEdit(record)}
              className="cursor-pointer rounded-lg border border-[#e0e0e8] px-3 py-1.5 text-xs font-semibold text-[#34343e] transition hover:bg-[#f7f7f8]"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(record)}
              className="cursor-pointer rounded-lg border border-[#e0e0e8] px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-[#2a2a33]">Details</h3>
          <dl className="space-y-2.5 rounded-xl border border-[#ececf1] px-4 py-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#8b8ba3]">Order</dt>
              <dd className="font-medium tabular-nums">
                {getSubscriptionOrderLabel(record)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#8b8ba3]">Product</dt>
              <dd className="min-w-0 truncate text-right font-medium">{record.title}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#8b8ba3]">Revenue</dt>
              <dd className="font-medium tabular-nums">
                {formatSubscriptionRevenue(record)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#8b8ba3]">Created</dt>
              <dd className="font-medium">
                {formatOrderDateTime(record.createdAt, timeZone)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#8b8ba3]">Updated</dt>
              <dd className="font-medium">
                {formatOrderDateTime(record.updatedAt, timeZone)}
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-[#2a2a33]">Customer</h3>
          <div className="flex items-center gap-3 rounded-xl border border-[#ececf1] px-4 py-3">
            <CustomerAvatar
              name={name}
              email={email}
              avatarUrl={email ? getGravatarUrl(email, 64) : undefined}
              size="lg"
            />
            <div className="min-w-0">
              <p className="truncate font-medium text-[#2a2a33]">{name || "—"}</p>
              <p className="mt-0.5 truncate text-sm text-[#8b8ba3]">{email}</p>
            </div>
          </div>
        </section>
      </div>
    </RightDrawerModal>
  );
}
