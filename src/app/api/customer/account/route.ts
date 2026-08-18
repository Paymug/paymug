import { z } from "zod";
import { updateCustomerProfile } from "@/lib/customer-accounts";
import { getCustomerSession } from "@/lib/customer-auth";
import { jsonError } from "@/lib/utils";

const customerProfileSchema = z.object({
  name: z.string().trim().max(120),
  avatarImageUrl: z
    .string()
    .max(1_500_000)
    .refine(
      (value) =>
        !value ||
        value.startsWith("data:image/jpeg;base64,") ||
        value.startsWith("data:image/png;base64,") ||
        value.startsWith("data:image/webp;base64,"),
      "Profile image must be a JPEG, PNG, or WebP image",
    ),
});

export async function PATCH(request: Request) {
  const customer = await getCustomerSession();
  if (!customer) return jsonError("Unauthorized", 401);
  const parsed = customerProfileSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message || "Invalid account settings",
    );
  }
  await updateCustomerProfile(customer.id, parsed.data);
  return Response.json({ ok: true });
}
