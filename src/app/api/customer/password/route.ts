import { z } from "zod";
import { hashPassword } from "@/lib/auth";
import { updateCustomerPassword } from "@/lib/customer-accounts";
import { getCustomerSession } from "@/lib/customer-auth";
import { jsonError } from "@/lib/utils";

const passwordSchema = z.object({
  password: z.string().min(8).max(200),
});

export async function PATCH(request: Request) {
  const customer = await getCustomerSession();
  if (!customer) return jsonError("Unauthorized", 401);
  const parsed = passwordSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message || "Password is invalid"
    );
  }
  await updateCustomerPassword(
    customer.id,
    await hashPassword(parsed.data.password)
  );
  return Response.json({ ok: true });
}
