import { createHmac, timingSafeEqual } from "crypto";
import type { StripeWebhookEvent } from "./stripe-webhooks.types";

function matchesSignature(expected: string, candidate: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const candidateBuffer = Buffer.from(candidate);
  return (
    expectedBuffer.length === candidateBuffer.length &&
    timingSafeEqual(expectedBuffer, candidateBuffer)
  );
}

export function parseVerifiedStripeWebhook(
  payload: string,
  signatureHeader: string,
  webhookSecret: string
): StripeWebhookEvent {
  const parts = signatureHeader.split(",");
  const timestamp = parts
    .find((part) => part.startsWith("t="))
    ?.slice(2);
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) {
    throw new Error("Invalid Stripe signature header");
  }
  const timestampSeconds = Number(timestamp);
  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(Date.now() / 1000 - timestampSeconds) > 300
  ) {
    throw new Error("Expired Stripe webhook signature");
  }
  const expected = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");
  if (!signatures.some((signature) => matchesSignature(expected, signature))) {
    throw new Error("Invalid Stripe webhook signature");
  }
  return JSON.parse(payload) as StripeWebhookEvent;
}
