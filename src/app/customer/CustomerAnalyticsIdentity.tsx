"use client";

import { useEffect } from "react";
import {
  getStoredVisitorIdentities,
  identifyAnalyticsVisitor,
} from "@/components/visitor-analytics-tracker.utils";

export function CustomerAnalyticsIdentity() {
  useEffect(() => {
    const identities = getStoredVisitorIdentities();
    if (identities.length === 0) return;
    void identifyAnalyticsVisitor({ identities });
  }, []);
  return null;
}
