const visitorStorageKeyPrefix = "paymug_analytics_visitor_id";
const recentlyTrackedPages = new Set<string>();

export interface AnalyticsVisitorIdentity {
  storeId: string;
  visitorId: string;
}

export function getStoredVisitorIdentities(): AnalyticsVisitorIdentity[] {
  const identities: AnalyticsVisitorIdentity[] = [];
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith(`${visitorStorageKeyPrefix}:`)) continue;
      const storeId = key.slice(visitorStorageKeyPrefix.length + 1);
      const visitorId = window.localStorage.getItem(key);
      if (storeId && visitorId) identities.push({ storeId, visitorId });
    }
  } catch {
    return identities;
  }
  return identities;
}

export function identifyAnalyticsVisitor(input: {
  email?: string;
  storeId?: string;
  visitorId?: string;
  identities?: AnalyticsVisitorIdentity[];
}): Promise<void> {
  return fetch("/api/analytics/identify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    keepalive: true,
  })
    .then(() => undefined)
    .catch(() => undefined);
}

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
