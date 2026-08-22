import { z } from "zod";
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
