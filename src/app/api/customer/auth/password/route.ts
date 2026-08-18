import { z } from "zod";
import { verifyPassword } from "@/lib/auth";
import { findCustomerByEmail } from "@/lib/customer-accounts";
import { setCustomerSession } from "@/lib/customer-auth";
import { jsonError } from "@/lib/utils";

const passwordLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const parsed = passwordLoginSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Invalid email or password", 400);
  const customer = await findCustomerByEmail(parsed.data.email);
  if (
    !customer?.passwordHash ||
    !(await verifyPassword(parsed.data.password, customer.passwordHash))
  ) {
    return jsonError("Invalid email or password", 401);
  }
  await setCustomerSession(customer.id);
  return Response.json({ ok: true });
}
