import {
  consumeCustomerAccessToken,
} from "@/lib/customer-accounts";
import { setCustomerSession } from "@/lib/customer-auth";
import { getRuntimeAbsoluteUrl } from "@/lib/runtime-env";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token");
  if (!token) {
    return Response.redirect(
      await getRuntimeAbsoluteUrl(
        "/customer/login?error=invalid_link",
        request.url
      ),
      302
    );
  }
  const customer = await consumeCustomerAccessToken(token);
  if (!customer) {
    return Response.redirect(
      await getRuntimeAbsoluteUrl(
        "/customer/login?error=expired_link",
        request.url
      ),
      302
    );
  }
  await setCustomerSession(customer.id);
  return Response.redirect(
    await getRuntimeAbsoluteUrl("/customer", request.url),
    302
  );
}
