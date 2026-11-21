import { formatMoney } from "@/lib/format";
import type { FeatureRecord } from "@/lib/feature-records.types";
import type { ChartPoint } from "./charts.types";

export type SubscriptionMetric = "total" | "new" | "active" | "churn";
export type SubscriptionInterval = "daily" | "weekly" | "monthly";
export type SubscriptionRangePreset = "7" | "30" | "90" | "365" | "all";

export const rangePresetOptions: Array<{
  value: SubscriptionRangePreset;
  label: string;
}> = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

export const intervalOptions: Array<{
  value: SubscriptionInterval;
  label: string;
}> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const dayMs = 86_400_000;
const endedStatuses = new Set(["cancelled", "expired"]);
const liveStatuses = new Set(["active", "trialing"]);

/** Tailwind classes per status so each state reads differently. */
const statusStyles: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-[#edfbf3] text-[#179a58]" },
  trialing: { label: "Trialing", className: "bg-[#fff4e5] text-[#c26a00]" },
  approval_pending: {
    label: "Pending",
    className: "bg-[#fff9db] text-[#a07800]",
  },
  past_due: { label: "Past due", className: "bg-[#fff0e6] text-[#d4500a]" },
  paused: { label: "Paused", className: "bg-[#eef1ff] text-[#4a5bd0]" },
  suspended: { label: "Suspended", className: "bg-[#f3eaff] text-[#7a3fd1]" },
  cancelled: { label: "Cancelled", className: "bg-[#fff0f4] text-[#ef174c]" },
  expired: { label: "Expired", className: "bg-[#f1f1f5] text-[#6f6f84]" },
};

export function getSubscriptionStatusStyle(status: string) {
  return (
    statusStyles[status] || {
      label: status.replaceAll("_", " "),
      className: "bg-[#f1f1f5] text-[#6f6f84]",
    }
  );
}

export function isSubscriptionEnded(record: FeatureRecord) {
  return endedStatuses.has(record.status);
}

export function isSubscriptionLive(record: FeatureRecord) {
  return liveStatuses.has(record.status);
}

function endedAt(record: FeatureRecord): string {
  const value = record.data.cancelledAt || record.data.expiredAt;
  return typeof value === "string" && value ? value : record.updatedAt;
}

/** `{amount with currency} / {period}`, e.g. `$34.00 / month`. */
export function formatSubscriptionRevenue(record: FeatureRecord): string {
  const currency =
    typeof record.data.currency === "string" && record.data.currency
      ? record.data.currency
      : "USD";
  const amount = Math.round(Number(record.data.amount || 0) * 100);
  const [rawUnit, rawCount] = String(record.data.interval || "month").split(":");
  const unit = String(record.data.intervalUnit || rawUnit || "month");
  const count = Math.max(
    1,
    Number(record.data.intervalCount) || Number(rawCount) || 1,
  );
  const period = count === 1 ? unit : `${count} ${unit}s`;
  return `${formatMoney(amount, currency)} / ${period}`;
}

export function getSubscriptionCustomerName(record: FeatureRecord): string {
  const name = record.data.customerName;
  return (typeof name === "string" && name.trim()) || record.subtitle || "";
}

export function getSubscriptionOrderLabel(record: FeatureRecord): string {
  const orderId = record.data.orderId;
  const source = typeof orderId === "string" && orderId ? orderId : record.id;
  return `#${source.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`;
}

// ---------------------------------------------------------------- dates

export function dayKey(value: string | Date, timeZone: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleDateString("en-CA", { timeZone });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function keyToTime(key: string) {
  return Date.parse(`${key}T00:00:00Z`);
}

function addDaysToKey(key: string, days: number) {
  return new Date(keyToTime(key) + days * dayMs).toISOString().slice(0, 10);
}

function daysBetween(startKey: string, endKey: string) {
  return Math.round((keyToTime(endKey) - keyToTime(startKey)) / dayMs);
}

export function formatDayKey(key: string, withYear = false) {
  return new Date(keyToTime(key)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

export interface SubscriptionRange {
  startKey: string;
  endKey: string;
}

export function getSubscriptionRange(
  preset: SubscriptionRangePreset,
  records: FeatureRecord[],
  timeZone: string,
  now = new Date(),
): SubscriptionRange {
  const endKey = dayKey(now, timeZone);
  if (preset === "all") {
    const earliest = records
      .map((record) => dayKey(record.createdAt, timeZone))
      .filter(Boolean)
      .sort()[0];
    return { startKey: earliest || addDaysToKey(endKey, -29), endKey };
  }
  return { startKey: addDaysToKey(endKey, -(Number(preset) - 1)), endKey };
}

interface Bucket {
  startKey: string;
  endKey: string;
  label: string;
}

function buildBuckets(
  range: SubscriptionRange,
  interval: SubscriptionInterval,
): Bucket[] {
  const buckets: Bucket[] = [];
  let cursor = range.startKey;
  while (cursor <= range.endKey && buckets.length < 800) {
    let end = cursor;
    if (interval === "weekly") {
      end = addDaysToKey(cursor, 6);
    } else if (interval === "monthly") {
      const [year, month] = cursor.split("-").map(Number);
      end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    }
    if (end > range.endKey) end = range.endKey;
    buckets.push({
      startKey: cursor,
      endKey: end,
      label:
        interval === "monthly"
          ? new Date(keyToTime(cursor)).toLocaleDateString("en-GB", {
              month: "short",
              year: "numeric",
              timeZone: "UTC",
            })
          : formatDayKey(cursor),
    });
    cursor = addDaysToKey(end, 1);
  }
  return buckets;
}

interface PreparedRecord {
  created: string;
  ended: string | null;
}

function prepare(
  records: FeatureRecord[],
  timeZone: string,
): PreparedRecord[] {
  return records.map((record) => ({
    created: dayKey(record.createdAt, timeZone),
    ended: isSubscriptionEnded(record) ? dayKey(endedAt(record), timeZone) : null,
  }));
}

function bucketValue(
  prepared: PreparedRecord[],
  bucket: Bucket,
  metric: SubscriptionMetric,
): number {
  let count = 0;
  for (const item of prepared) {
    if (!item.created) continue;
    if (metric === "total") {
      if (item.created <= bucket.endKey) count += 1;
    } else if (metric === "new") {
      if (item.created >= bucket.startKey && item.created <= bucket.endKey) {
        count += 1;
      }
    } else if (metric === "active") {
      if (
        item.created <= bucket.endKey &&
        !(item.ended && item.ended <= bucket.endKey)
      ) {
        count += 1;
      }
    } else if (
      item.ended &&
      item.ended >= bucket.startKey &&
      item.ended <= bucket.endKey
    ) {
      count += 1;
    }
  }
  return count;
}

export function buildSubscriptionSeries(
  records: FeatureRecord[],
  range: SubscriptionRange,
  interval: SubscriptionInterval,
  metric: SubscriptionMetric,
  timeZone: string,
): { data: ChartPoint[]; comparisonData: ChartPoint[] } {
  const prepared = prepare(records, timeZone);
  const buckets = buildBuckets(range, interval);
  const length = daysBetween(range.startKey, range.endKey) + 1;
  const previousRange = {
    startKey: addDaysToKey(range.startKey, -length),
    endKey: addDaysToKey(range.startKey, -1),
  };
  const previousBuckets = buildBuckets(previousRange, interval);
  return {
    data: buckets.map((bucket) => ({
      label: bucket.label,
      date: bucket.startKey,
      value: bucketValue(prepared, bucket, metric),
    })),
    comparisonData: buckets.map((bucket, index) => {
      const previous = previousBuckets[index];
      return {
        label: bucket.label,
        date: previous?.startKey,
        value: previous ? bucketValue(prepared, previous, metric) : 0,
      };
    }),
  };
}

export interface SubscriptionStats {
  total: number;
  created: number;
  active: number;
  churnRate: number;
}

export function getSubscriptionStats(
  records: FeatureRecord[],
  range: SubscriptionRange,
  timeZone: string,
): SubscriptionStats {
  const prepared = prepare(records, timeZone);
  let created = 0;
  let churned = 0;
  let atRisk = 0;
  for (const item of prepared) {
    if (item.created >= range.startKey && item.created <= range.endKey) {
      created += 1;
    }
    // Subscriptions that were live at any point in the range.
    if (
      item.created <= range.endKey &&
      !(item.ended && item.ended < range.startKey)
    ) {
      atRisk += 1;
    }
    if (item.ended && item.ended >= range.startKey && item.ended <= range.endKey) {
      churned += 1;
    }
  }
  return {
    total: records.length,
    created,
    active: records.filter(isSubscriptionLive).length,
    churnRate: atRisk > 0 ? (churned / atRisk) * 100 : 0,
  };
}

// --------------------------------------------------------------- export

function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function buildSubscriptionsCsv(records: FeatureRecord[]): string {
  const header = ["Order", "Created", "Status", "Customer", "Email", "Product", "Revenue"];
  const rows = records.map((record) => [
    getSubscriptionOrderLabel(record),
    record.createdAt,
    record.status,
    getSubscriptionCustomerName(record),
    record.subtitle || "",
    record.title,
    formatSubscriptionRevenue(record),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
