import { createHmac, timingSafeEqual } from "crypto";
import type { PayPalMode } from "./types";
import type {
  SepayCheckoutFields,
  SepayCheckoutInput,
  SepayIpnPayload,
} from "./sepay.types";

const SEPAY_CHECKOUT_URLS: Record<PayPalMode, string> = {
  sandbox: "https://pay-sandbox.sepay.vn/v1/checkout/init",
  live: "https://pay.sepay.vn/v1/checkout/init",
};

/** Fields covered by the checkout signature (custom_data is not signed). */
const SIGNED_FIELDS = new Set([
  "merchant",
  "operation",
  "payment_method",
  "order_amount",
  "currency",
  "order_invoice_number",
  "order_description",
  "customer_id",
  "success_url",
  "error_url",
  "cancel_url",
  "order_id",
]);

export const SEPAY_CURRENCY = "VND";

export function getSepayCheckoutUrl(mode: PayPalMode): string {
  return SEPAY_CHECKOUT_URLS[mode];
}

/** Order amounts are stored in hundredths of the currency unit; VND has none. */
export function toSepayAmount(amountCents: number): number {
  return Math.round(amountCents / 100);
}

/**
 * Mirrors the official `sepay-pg-node` SDK: signed fields are joined in the
 * object's own key order, so the checkout form must post inputs in that same
 * order.
 */
export function signSepayCheckoutFields(
  fields: Record<string, string | number | undefined>,
  secretKey: string
): string {
  const signed = Object.keys(fields)
    .filter((name) => SIGNED_FIELDS.has(name) && fields[name] !== undefined)
    .map((name) => `${name}=${fields[name]}`);
  return createHmac("sha256", secretKey)
    .update(signed.join(","), "utf8")
    .digest("base64");
}

export function buildSepayCheckoutFields(
  input: SepayCheckoutInput
): SepayCheckoutFields {
  const fields = {
    operation: "PURCHASE" as const,
    order_invoice_number: input.orderId,
    order_amount: toSepayAmount(input.amountCents),
    currency: SEPAY_CURRENCY,
    order_description: input.description,
    success_url: input.successUrl,
    error_url: input.errorUrl,
    cancel_url: input.cancelUrl,
    merchant: input.merchantId,
  };
  return {
    ...fields,
    signature: signSepayCheckoutFields(fields, input.secretKey),
  };
}

export function matchesSepayIpnSecret(
  headerValue: string | null,
  ipnSecret: string
): boolean {
  if (!headerValue) return false;
  const expected = Buffer.from(ipnSecret);
  const candidate = Buffer.from(headerValue);
  return (
    expected.length === candidate.length && timingSafeEqual(expected, candidate)
  );
}

export function parseSepayIpn(payload: string): SepayIpnPayload {
  const data = JSON.parse(payload) as SepayIpnPayload;
  if (!data || typeof data !== "object" || !data.order) {
    throw new Error("Invalid SePay IPN payload");
  }
  return data;
}
