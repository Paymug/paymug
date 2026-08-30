import { z } from "zod";
import { getStoreById } from "@/lib/stores";
import { recordVisitorEvent } from "@/lib/visitor-analytics";
import { jsonError } from "@/lib/utils";
import {
  getAnalyticsDevice,
  getAnalyticsLocation,
  getAnalyticsOperatingSystem,
  getAnalyticsSource,
} from "./analytics-track.utils";
import type { CloudflareAnalyticsRequest } from "./analytics-track.types";

const analyticsTrackSchema = z.object({
  storeId: z.string().min(1).max(100),
  visitorId: z.string().min(8).max(100),
  path: z.string().min(1).max(500),
  referrer: z.string().max(2048),
});

export async function POST(request: Request) {
  const parsed = analyticsTrackSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return jsonError("Invalid analytics event");
  const store = await getStoreById(parsed.data.storeId);
  if (!store || !store.analyticsEnabled) {
    return new Response(null, { status: 204 });
  }

  const userAgent = request.headers.get("user-agent") || "";
  const location = getAnalyticsLocation(request as CloudflareAnalyticsRequest);
  await recordVisitorEvent({
    storeId: store.id,
    visitorId: parsed.data.visitorId,
    path: parsed.data.path,
    source: getAnalyticsSource(parsed.data.referrer, request.url),
    device: getAnalyticsDevice(userAgent),
    os: getAnalyticsOperatingSystem(userAgent),
    city: location.city,
    country: location.country,
  });
  return new Response(null, { status: 204 });
}
