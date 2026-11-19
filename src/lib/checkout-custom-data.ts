import { z } from "zod";
import { returnUrlCustomKey } from "./return-url";
import type {
  CheckoutCustomData,
  CheckoutSearchParams,
} from "./checkout-custom-data.types";

const customPropertyPattern = /^[A-Za-z0-9_.-]{1,64}$/;

export const checkoutCustomDataSchema = z
  .record(
    z.string().regex(customPropertyPattern, "Invalid custom property name"),
    z.string().max(1_000),
  )
  .refine((value) => Object.keys(value).length <= 50, {
    message: "Custom data can contain at most 50 fields",
  })
  .refine(
    (value) =>
      Object.entries(value).reduce(
        (total, [key, entry]) => total + key.length + entry.length,
        0,
      ) <= 10_000,
    { message: "Custom data is too large" },
  );

export function parseCheckoutCustomData(
  searchParams: CheckoutSearchParams,
): CheckoutCustomData {
  const custom: CheckoutCustomData = {};
  for (const [key, rawValue] of Object.entries(searchParams)) {
    const match = /^\[custom\]\[([^\]]+)\]$/.exec(key);
    if (!match || !customPropertyPattern.test(match[1])) continue;
    const value = Array.isArray(rawValue)
      ? rawValue.at(-1)
      : rawValue;
    if (value === undefined) continue;
    custom[match[1]] = value.slice(0, 1_000);
    if (Object.keys(custom).length >= 50) break;
  }
  // `?[return_url]=` is shorthand for `?[custom][return_url]=`.
  const rawReturnUrl = searchParams["[return_url]"];
  const returnUrl = Array.isArray(rawReturnUrl)
    ? rawReturnUrl.at(-1)
    : rawReturnUrl;
  if (
    returnUrl &&
    !custom[returnUrlCustomKey] &&
    Object.keys(custom).length < 50
  ) {
    custom[returnUrlCustomKey] = returnUrl.slice(0, 1_000);
  }
  const parsed = checkoutCustomDataSchema.safeParse(custom);
  return parsed.success ? parsed.data : {};
}

export function normalizeCheckoutCustomData(
  value: unknown,
): CheckoutCustomData {
  const parsed = checkoutCustomDataSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

export function parseStoredCheckoutCustomData(
  value: string,
): CheckoutCustomData {
  try {
    return normalizeCheckoutCustomData(JSON.parse(value));
  } catch {
    return {};
  }
}

export function appendCheckoutCustomData(
  query: URLSearchParams,
  custom: CheckoutCustomData | undefined,
): void {
  if (!custom) return;
  for (const [key, value] of Object.entries(custom)) {
    query.set(`[custom][${key}]`, value);
  }
}

/** Reads `?email=` for prefill only; anything that is not a plain email is ignored. */
export function parseInitialCheckoutEmail(
  value: string | string[] | undefined,
): string | undefined {
  const email = (Array.isArray(value) ? value.at(-1) : value)?.trim();
  if (!email || email.length > 254) return undefined;
  return /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(email)
    ? email
    : undefined;
}
