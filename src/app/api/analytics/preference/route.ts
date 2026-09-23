import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { updateStore } from "@/lib/stores";
import { jsonError } from "@/lib/utils";
import { serializeAnalyticsCommerceMetrics } from "@/lib/analytics-commerce.utils";

const analyticsPreferenceSchema = z.object({
  commerceMetrics: z.array(z.enum(["orders", "revenue"])).max(2),
});

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = analyticsPreferenceSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid preference");
  }
  const store = await updateStore(user.activeStoreId, user.id, {
    analyticsCommerceMetric: serializeAnalyticsCommerceMetrics(
      parsed.data.commerceMetrics,
    ),
  });
  if (!store) return jsonError("Store not found", 404);
  return Response.json({ store });
}
