import {
  findFeatureRecord,
  updateFeatureRecord,
} from "@/lib/feature-records";
import type { UnsubscribeRouteContext } from "./route.types";

export async function GET(
  _req: Request,
  { params }: UnsubscribeRouteContext
) {
  const { userId, subscriberId } = await params;
  const subscriber = await findFeatureRecord(subscriberId, userId);
  if (subscriber?.feature === "subscribers") {
    await updateFeatureRecord(subscriber.id, userId, {
      status: "unsubscribed",
      data: {
        ...subscriber.data,
        unsubscribedAt: new Date().toISOString(),
      },
    });
  }
  return new Response(
    "<!doctype html><html><body style=\"font-family:system-ui;padding:48px;text-align:center\"><h1>You’re unsubscribed</h1><p>You will no longer receive marketing emails from this store.</p></body></html>",
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function POST(
  req: Request,
  context: UnsubscribeRouteContext
) {
  return GET(req, context);
}
