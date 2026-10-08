import {
  formatDateInTimeZone,
  formatDateTimeInTimeZone,
} from "@/lib/timezone";

export function formatCustomerDate(value: string, timeZone: string): string {
  return formatDateInTimeZone(value, timeZone);
}

export function formatCustomerDateTime(
  value: string,
  timeZone: string,
): string {
  return formatDateTimeInTimeZone(value, timeZone);
}
