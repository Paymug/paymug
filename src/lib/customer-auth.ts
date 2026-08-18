import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { findCustomerById } from "./customer-accounts";
import { getRequiredRuntimeEnvValue } from "./runtime-env";
import type {
  CustomerAccount,
  PublicCustomer,
} from "./customer-auth.types";

const customerCookieName = "paymug_customer_session";

async function getCustomerSessionSecret(): Promise<Uint8Array> {
  const secret = await getRequiredRuntimeEnvValue("AUTH_SECRET");
  return new TextEncoder().encode(`customer:${secret}`);
}

export function toPublicCustomer(
  customer: CustomerAccount
): PublicCustomer {
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    avatarImageUrl: customer.avatarImageUrl,
    hasPassword: Boolean(customer.passwordHash),
  };
}

export async function createCustomerSessionToken(
  customerId: string
): Promise<string> {
  return new SignJWT({ sub: customerId })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("customer")
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(await getCustomerSessionSecret());
}

export async function setCustomerSession(
  customerId: string
): Promise<void> {
  const cookieJar = await cookies();
  cookieJar.set(
    customerCookieName,
    await createCustomerSessionToken(customerId),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    }
  );
}

export async function clearCustomerSession(): Promise<void> {
  const cookieJar = await cookies();
  cookieJar.delete(customerCookieName);
}

export async function getCustomerSession(): Promise<PublicCustomer | null> {
  const cookieJar = await cookies();
  const token = cookieJar.get(customerCookieName)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(
      token,
      await getCustomerSessionSecret(),
      { audience: "customer" }
    );
    if (typeof payload.sub !== "string") return null;
    const customer = await findCustomerById(payload.sub);
    return customer ? toPublicCustomer(customer) : null;
  } catch {
    return null;
  }
}
