import type { CloudflareAnalyticsRequest } from "./analytics-track.types";

export function getAnalyticsSource(referrer: string, requestUrl: string): string {
  if (!referrer) return "Direct";
  try {
    const sourceUrl = new URL(referrer);
    const requestHost = new URL(requestUrl).hostname;
    if (sourceUrl.hostname === requestHost) return "Direct";
    return sourceUrl.hostname.replace(/^www\./, "") || "Direct";
  } catch {
    return "Direct";
  }
}

export function getAnalyticsDevice(userAgent: string): string {
  if (/ipad|tablet|kindle|silk|playbook/i.test(userAgent)) return "Tablet";
  if (/mobile|iphone|ipod|android/i.test(userAgent)) return "Mobile";
  return "Desktop";
}

export function getAnalyticsOperatingSystem(userAgent: string): string {
  if (/windows/i.test(userAgent)) return "Windows";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/android/i.test(userAgent)) return "Android";
  if (/macintosh|mac os x/i.test(userAgent)) return "macOS";
  if (/cros/i.test(userAgent)) return "ChromeOS";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Other";
}

export function getAnalyticsLocation(request: CloudflareAnalyticsRequest) {
  const city = typeof request.cf?.city === "string" ? request.cf.city : "Unknown";
  const countryFromRequest = typeof request.cf?.country === "string" ? request.cf.country : undefined;
  const country = countryFromRequest || request.headers.get("cf-ipcountry") || "Unknown";
  return { city, country };
}
