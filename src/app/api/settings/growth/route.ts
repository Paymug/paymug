import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { updateStore } from "@/lib/stores";
import { requireProFeature } from "@/lib/pro-feature-access";
import { jsonError } from "@/lib/utils";

const growthSettingsSchema = z
  .object({
    storeId: z.string().min(1),
    affiliatesEnabled: z.boolean(),
    affiliateCommissionType: z.enum(["percentage", "fixed"]),
    affiliateCommissionValue: z.number().min(0).max(1_000_000),
    affiliateCommissionDuration: z.enum(["one_time", "recurring"]),
    affiliateAttributionModel: z.enum(["first_click", "last_click"]),
    emailCampaignsEnabled: z.boolean(),
    analyticsEnabled: z.boolean(),
  })
  .refine(
    (settings) =>
      settings.affiliateCommissionType !== "percentage" ||
      settings.affiliateCommissionValue <= 100,
    {
      message: "Percentage commissions cannot exceed 100%",
      path: ["affiliateCommissionValue"],
    }
  );

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = growthSettingsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid settings");
  }
  const { storeId, ...settings } = parsed.data;
  if (storeId !== user.activeStoreId) {
    return jsonError("Store not found", 404);
  }
  if (settings.affiliatesEnabled) {
    const denied = await requireProFeature("affiliates");
    if (denied) return denied;
  }
  if (settings.emailCampaignsEnabled) {
    const denied = await requireProFeature("email_campaigns");
    if (denied) return denied;
  }
  const store = await updateStore(storeId, user.id, settings);
  if (!store) return jsonError("Store not found", 404);
  return Response.json({ store });
}
