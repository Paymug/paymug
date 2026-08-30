"use client";

import { useEffect } from "react";
import { sendVisitorAnalyticsEvent } from "./visitor-analytics-tracker.utils";
import type { VisitorAnalyticsTrackerProps } from "./VisitorAnalyticsTracker.types";

export function VisitorAnalyticsTracker({ storeId, enabled }: VisitorAnalyticsTrackerProps) {
  useEffect(() => {
    if (enabled) sendVisitorAnalyticsEvent(storeId);
  }, [enabled, storeId]);
  return null;
}
