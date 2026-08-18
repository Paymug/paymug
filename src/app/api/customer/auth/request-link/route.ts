import { z } from "zod";
import {
  customerHasPortalAccess,
  findCustomerByEmail,
  getOrCreateCustomerAccount,
  saveCustomerAccessToken,
} from "@/lib/customer-accounts";
import { sendCustomerPortalLoginEmail } from "@/lib/customer-portal-email";
import { createCustomerAccessToken } from "@/lib/customer-token.utils";
import { getRuntimeAbsoluteUrl } from "@/lib/runtime-env";
import { jsonError } from "@/lib/utils";

const requestLinkSchema = z.object({
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  const parsed = requestLinkSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Enter a valid email address");
  const email = parsed.data.email.toLowerCase();
  const [existingCustomer, hasOrders] = await Promise.all([
    findCustomerByEmail(email),
    customerHasPortalAccess(email),
  ]);
  if (existingCustomer || hasOrders) {
    const customer =
      existingCustomer || (await getOrCreateCustomerAccount(email));
    const token = createCustomerAccessToken();
    await saveCustomerAccessToken(
      customer.id,
      token,
      new Date(Date.now() + 15 * 60 * 1000).toISOString()
    );
    const loginUrl = new URL(
      await getRuntimeAbsoluteUrl("/api/customer/auth/verify", request.url)
    );
    loginUrl.searchParams.set("token", token);
    await sendCustomerPortalLoginEmail(email, loginUrl.toString());
  }
  return Response.json({
    ok: true,
    message:
      "If purchases are associated with that email, a sign-in link is on its way.",
  });
}
