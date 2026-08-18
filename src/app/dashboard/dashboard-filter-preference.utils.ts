import {
  dashboardFilterCookieName,
  parseDashboardFilterState,
} from "./dashboard-filter.utils";
import type {
  DashboardFilterPreference,
  DashboardFilterState,
} from "./dashboard-overview.types";

const dashboardFilterPreferenceKey = "paymug.dashboard.filters";

export function hasDashboardFilterCookie() {
  try {
    return document.cookie
      .split(";")
      .some((part) => part.trim().startsWith(`${dashboardFilterCookieName}=`));
  } catch {
    return false;
  }
}

export function readDashboardFilterPreference(
  validProductIds: string[]
): DashboardFilterPreference | undefined {
  try {
    const stored = window.localStorage.getItem(dashboardFilterPreferenceKey);
    if (!stored) return undefined;
    const value = JSON.parse(stored) as Partial<DashboardFilterPreference>;
    const parsed = parseDashboardFilterState({
      start: value.startDate,
      end: value.endDate,
      interval: value.interval,
      product: value.productId,
    });
    return {
      ...parsed,
      productId:
        parsed.productId === "all" || validProductIds.includes(parsed.productId)
          ? parsed.productId
          : "all",
    };
  } catch {
    return undefined;
  }
}

export function saveDashboardFilterPreference(
  state: DashboardFilterState
) {
  try {
    window.localStorage.setItem(
      dashboardFilterPreferenceKey,
      JSON.stringify(state)
    );
  } catch {
    // Cookie-based filtering continues to work when storage is unavailable.
  }
  try {
    document.cookie = `${dashboardFilterCookieName}=${encodeURIComponent(
      JSON.stringify(state)
    )};path=/;max-age=31536000;samesite=lax`;
  } catch {
    // The in-memory selection still works when cookies are unavailable.
  }
}

export function dashboardFilterStatesMatch(
  left: DashboardFilterState,
  right: DashboardFilterState
) {
  return (
    left.startDate === right.startDate &&
    left.endDate === right.endDate &&
    left.interval === right.interval &&
    left.productId === right.productId
  );
}
