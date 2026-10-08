"use client";

import { createContext, useContext } from "react";
import { defaultTimeZone } from "@/lib/timezone";

const TimeZoneContext = createContext(defaultTimeZone);

export function TimeZoneProvider({
  timeZone,
  children,
}: {
  timeZone: string;
  children: React.ReactNode;
}) {
  return (
    <TimeZoneContext.Provider value={timeZone}>
      {children}
    </TimeZoneContext.Provider>
  );
}

/** The signed-in user's time zone for formatting dashboard timestamps. */
export function useTimeZone(): string {
  return useContext(TimeZoneContext);
}
