"use client";

import { useSyncExternalStore } from "react";
import { defaultTimeZone, resolveTimeZone } from "@/lib/timezone";

const subscribe = () => () => {};

/** The visitor's own time zone; renders UTC on the server and during hydration. */
export function useBrowserTimeZone(): string {
  return useSyncExternalStore(
    subscribe,
    () => resolveTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone),
    () => defaultTimeZone,
  );
}
