import { z } from "zod";
import { getCustomerSession } from "@/lib/customer-auth";
import {
  listCustomerStoreEmailPreferences,
  updateCustomerStoreEmailPreferences,
} from "@/lib/customer-email-preferences";
import { jsonError } from "@/lib/utils";

const emailPreferencesSchema = z.object({
  storeId: z.string().min(1),
  marketingEnabled: z.boolean(),
  productUpdatesEnabled: z.boolean(),
  affiliateUpdatesEnabled: z.boolean(),
});

export async function PATCH(request: Request) {
  const customer = await getCustomerSession();
  if (!customer) return jsonError("Unauthorized", 401);
  const parsed = emailPreferencesSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Invalid email preferences");
  const availableStores = await listCustomerStoreEmailPreferences(customer.email);
  if (!availableStores.some((store) => store.storeId === parsed.data.storeId)) {
    return jsonError("Store not found", 404);
  }
  await updateCustomerStoreEmailPreferences(customer.email, parsed.data);
  return Response.json({ ok: true });
}
