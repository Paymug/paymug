export interface AnalyticsTrackRequestBody {
  storeId: string;
  visitorId: string;
  path: string;
  referrer: string;
}

export interface CloudflareAnalyticsRequest extends Request {
  cf?: {
    city?: unknown;
    country?: unknown;
  };
}
