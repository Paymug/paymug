import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { requireProFeature } from "@/lib/pro-feature-access";
import { updateStore } from "@/lib/stores";
import { jsonError } from "@/lib/utils";

const automationSettingsSchema = z.object({
  enabled: z.boolean(),
});

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const denied = await requireProFeature("automations");
  if (denied) return denied;
  const parsed = automationSettingsSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Invalid automation settings");
  const store = await updateStore(user.activeStoreId, user.id, {
    abandonedCheckoutRemindersEnabled: parsed.data.enabled,
  });
  if (!store) return jsonError("Store not found", 404);
  return Response.json({ enabled: store.abandonedCheckoutRemindersEnabled });
}
