"use client";

import {
  formatDateInTimeZone,
  formatDateTimeInTimeZone,
} from "@/lib/timezone";
import { useBrowserTimeZone } from "./use-browser-time-zone";

/** Shows a timestamp in the visitor's own time zone. */
export function LocalDateTime({
  value,
  variant = "datetime",
}: {
  value: string;
  variant?: "date" | "datetime";
}) {
  const timeZone = useBrowserTimeZone();
  return (
    <>
      {variant === "date"
        ? formatDateInTimeZone(value, timeZone)
        : formatDateTimeInTimeZone(value, timeZone)}
    </>
  );
}
