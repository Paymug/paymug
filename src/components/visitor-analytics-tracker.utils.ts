const visitorStorageKeyPrefix = "paymug_analytics_visitor_id";
const recentlyTrackedPages = new Set<string>();

export function getAnalyticsVisitorId(storeId: string): string {
  const visitorId = crypto.randomUUID();
  const visitorStorageKey = `${visitorStorageKeyPrefix}:${storeId}`;
  try {
    const stored = window.localStorage.getItem(visitorStorageKey);
    if (stored) return stored;
    window.localStorage.setItem(visitorStorageKey, visitorId);
  } catch {
    return visitorId;
  }
  return visitorId;
}

export function shouldTrackAnalyticsPage(
  storeId: string,
  path: string,
): boolean {
  const key = `${storeId}:${path}`;
  if (recentlyTrackedPages.has(key)) return false;
  recentlyTrackedPages.add(key);
  window.setTimeout(() => recentlyTrackedPages.delete(key), 2_000);
  return true;
}

export function sendVisitorAnalyticsEvent(storeId: string): void {
  const path = window.location.pathname;
  if (!shouldTrackAnalyticsPage(storeId, path)) return;
  const body = JSON.stringify({
    storeId,
    visitorId: getAnalyticsVisitorId(storeId),
    path,
    referrer: document.referrer,
  });
  if (
    navigator.sendBeacon?.(
      "/api/analytics/track",
      new Blob([body], { type: "application/json" }),
    )
  ) {
    return;
  }
  void fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  });
}
