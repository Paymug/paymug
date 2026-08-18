import type {
  DashboardFilterState,
  DashboardInterval,
  DashboardOverviewSearchParams,
} from "./dashboard-overview.types";

export const dashboardFilterCookieName = "paymug.dashboard.filters";

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function fromDateKey(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

function isDateKey(value?: string): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(fromDateKey(value).getTime());
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function addMonths(month: string, amount: number) {
  const date = fromDateKey(`${month}-01`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return toDateKey(date).slice(0, 7);
}

export function getMonthKey(date = new Date()) {
  return toDateKey(date).slice(0, 7);
}

export function formatMonthTitle(month: string) {
  return fromDateKey(`${month}-01`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatRangeDate(value: string) {
  return fromDateKey(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function getDashboardInterval(
  startDate: string,
  endDate: string,
): DashboardInterval {
  const days =
    Math.abs(
      Math.round(
        (fromDateKey(endDate).getTime() - fromDateKey(startDate).getTime()) /
          86_400_000,
      ),
    ) + 1;
  if (days < 7 * 7) return "daily";
  if (days < 365) return "weekly";
  return "monthly";
}

export function formatDashboardPeriodLabel(
  startDate: string,
  endDate: string,
): string {
  const days =
    Math.abs(
      Math.round(
        (fromDateKey(endDate).getTime() - fromDateKey(startDate).getTime()) /
          86_400_000,
      ),
    ) + 1;
  if (days === 1) return "Today";
  if ([7, 14, 30].includes(days)) return `Last ${days} days`;
  if (days === 90) return "Last 3 months";
  if (days === 365) return "Last 12 months";
  return `${formatRangeDate(startDate)} — ${formatRangeDate(endDate)}`;
}

export function getCalendarDays(month: string) {
  const first = fromDateKey(`${month}-01`);
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const calendarStart = addDays(first, -mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(calendarStart, index);
    return {
      date: toDateKey(date),
      day: date.getUTCDate(),
      inMonth: toDateKey(date).slice(0, 7) === month,
    };
  });
}

export function getPresetRange(
  preset:
    | "today"
    | "7"
    | "14"
    | "30"
    | "90"
    | "365"
    | "month"
    | "quarter"
    | "year"
    | "all",
  earliestDate?: string
) {
  const end = new Date();
  end.setUTCHours(12, 0, 0, 0);
  let start = new Date(end);

  if (preset === "today") {
    start = end;
  } else if (preset === "month") {
    start.setUTCDate(1);
  } else if (preset === "quarter") {
    start.setUTCMonth(Math.floor(start.getUTCMonth() / 3) * 3, 1);
  } else if (preset === "year") {
    start.setUTCMonth(0, 1);
  } else if (preset === "all" && earliestDate && isDateKey(earliestDate)) {
    start = fromDateKey(earliestDate);
  } else {
    const days = Number(preset);
    start = addDays(end, -(Number.isFinite(days) ? days - 1 : 29));
  }

  return {
    startDate: toDateKey(start),
    endDate: toDateKey(end),
  };
}

export function parseDashboardFilterState(
  params: DashboardOverviewSearchParams,
  saved?: DashboardFilterState
): DashboardFilterState {
  const fallbackDays =
    params.range === "7" ? 7 : params.range === "90" ? 90 : 30;
  const fallback = getPresetRange(String(fallbackDays) as "7" | "30" | "90");
  const startDate = isDateKey(params.start)
    ? params.start
    : saved && isDateKey(saved.startDate)
      ? saved.startDate
      : fallback.startDate;
  const endDate = isDateKey(params.end)
    ? params.end
    : saved && isDateKey(saved.endDate)
      ? saved.endDate
      : fallback.endDate;
  const ordered =
    startDate <= endDate
      ? { startDate, endDate }
      : { startDate: endDate, endDate: startDate };
  const interval = getDashboardInterval(
    ordered.startDate,
    ordered.endDate,
  );

  return {
    ...ordered,
    interval,
    productId: params.product || saved?.productId || "all",
  };
}

export function parseDashboardFilterCookie(
  value: string | undefined
): DashboardFilterState | undefined {
  if (!value) return undefined;
  try {
    return parseDashboardFilterState(
      {},
      JSON.parse(decodeURIComponent(value)) as DashboardFilterState
    );
  } catch {
    return undefined;
  }
}
