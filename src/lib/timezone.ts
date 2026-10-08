export const defaultTimeZone = "UTC";

const fallbackTimeZones = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Ho_Chi_Minh",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const partsFormatters = new Map<string, Intl.DateTimeFormat>();

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function resolveTimeZone(value?: string | null): string {
  return isValidTimeZone(value) ? value : defaultTimeZone;
}

export function listTimeZones(): string[] {
  const supported =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : fallbackTimeZones;
  return supported.includes("UTC") ? supported : ["UTC", ...supported];
}

function getPartsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Milliseconds the zone's wall clock is ahead of UTC at the given instant. */
export function getTimeZoneOffsetMs(instant: number, timeZone: string): number {
  if (timeZone === defaultTimeZone) return 0;
  const parts: Record<string, number> = {};
  for (const part of getPartsFormatter(timeZone).formatToParts(instant)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  const wallClock = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour % 24,
    parts.minute,
    parts.second,
  );
  return wallClock - Math.floor(instant / 1000) * 1000;
}

/**
 * Re-expresses a UTC timestamp as the zone's wall-clock time, still written as
 * a "Z" ISO string. Slicing the result gives the local day or hour, so the
 * dashboard's UTC bucketing works on local time. Never store or send the
 * shifted value as a real instant.
 */
export function toWallClockIso(value: string, timeZone: string): string {
  if (timeZone === defaultTimeZone) return value;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return value;
  return new Date(time + getTimeZoneOffsetMs(time, timeZone)).toISOString();
}

/** Shifts every full ISO timestamp string found anywhere in the value. */
export function shiftToWallClock<T>(value: T, timeZone: string): T {
  if (timeZone === defaultTimeZone) return value;
  if (typeof value === "string") {
    return (
      isoTimestampPattern.test(value) ? toWallClockIso(value, timeZone) : value
    ) as T;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => shiftToWallClock(entry, timeZone)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        shiftToWallClock(entry, timeZone),
      ]),
    ) as T;
  }
  return value;
}

/** Today's date (YYYY-MM-DD) in the zone. */
export function getTodayKey(timeZone: string, now = new Date()): string {
  return toWallClockIso(now.toISOString(), timeZone).slice(0, 10);
}

/** UTC date range wide enough to contain the zone's local days. */
export function getUtcQueryRange(startDate: string, endDate: string) {
  const shift = (key: string, days: number) => {
    const date = new Date(`${key}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };
  return { startDate: shift(startDate, -1), endDate: shift(endDate, 1) };
}

export function formatInTimeZone(
  value: string | number | Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
  fallback = "—",
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: resolveTimeZone(timeZone),
  }).format(date);
}

export function formatDateInTimeZone(
  value: string,
  timeZone: string,
  fallback = "—",
): string {
  return formatInTimeZone(
    value,
    timeZone,
    { day: "numeric", month: "short", year: "numeric" },
    fallback,
  );
}

export function formatDateTimeInTimeZone(
  value: string,
  timeZone: string,
  fallback = "—",
): string {
  return formatInTimeZone(
    value,
    timeZone,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
    fallback,
  );
}

export function getTimeZoneOptions(
  now = new Date(),
): Array<{ value: string; label: string }> {
  return listTimeZones().map((value) => {
    let offset = "";
    try {
      offset =
        new Intl.DateTimeFormat("en-US", {
          timeZone: value,
          timeZoneName: "shortOffset",
        })
          .formatToParts(now)
          .find((part) => part.type === "timeZoneName")?.value || "";
    } catch {
      // Offset is only a hint in the label.
    }
    const name = value.replace(/_/g, " ");
    return { value, label: offset ? `${name} (${offset})` : name };
  });
}

/** Inverse of toWallClockIso: the real instant for a wall-clock time in the zone. */
export function fromWallClockIso(wallClock: string, timeZone: string): string {
  if (timeZone === defaultTimeZone) return wallClock;
  const wall = Date.parse(wallClock);
  if (Number.isNaN(wall)) return wallClock;
  const firstGuess = wall - getTimeZoneOffsetMs(wall, timeZone);
  const instant = wall - getTimeZoneOffsetMs(firstGuess, timeZone);
  return new Date(instant).toISOString();
}
