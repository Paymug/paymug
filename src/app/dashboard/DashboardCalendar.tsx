"use client";

import { getCalendarDays, formatMonthTitle } from "./dashboard-filter.utils";
import type { DashboardCalendarProps } from "./dashboard-overview.types";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function DashboardCalendar({
  month,
  startDate,
  endDate,
  onSelect,
}: DashboardCalendarProps) {
  return (
    <div className="min-w-0 flex-1 p-5 sm:p-7">
      <h3 className="text-center text-lg font-semibold">
        {formatMonthTitle(month)}
      </h3>
      <div className="mt-6 grid grid-cols-7 text-center">
        {weekdays.map((weekday) => (
          <span key={weekday} className="py-2 text-sm font-medium">
            {weekday}
          </span>
        ))}
        {getCalendarDays(month).map((day) => {
          const inRange = day.date >= startDate && day.date <= endDate;
          const isEndpoint = day.date === startDate || day.date === endDate;

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelect(day.date)}
              className={`h-10 text-xs transition ${
                !day.inMonth
                  ? "text-transparent pointer-events-none"
                  : isEndpoint
                    ? "calendar-endpoint bg-accent font-semibold text-dark"
                    : inRange
                      ? "bg-accent-soft"
                      : "text-[#333] hover:bg-[#f7f7f8]"
              } ${isEndpoint ? (day.date <= startDate ? "rounded-tl-xl" : "rounded-br-xl") : ""}`}
            >
              {day.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
