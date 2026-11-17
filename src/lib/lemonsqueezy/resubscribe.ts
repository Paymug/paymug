import { createHmac, timingSafeEqual } from "node:crypto";

/** Checkout custom-data key carrying a signed re-subscribe token. */
export const resubscribeCustomKey = "resub";

function signature(recordId: string, secret: string): string {
  return createHmac("sha256", secret).update(`resub:${recordId}`).digest("base64url").slice(0, 32);
}

/** `recordId.signature`: proves the link came from the seller's own email. */
export function signResubscribeToken(recordId: string, secret: string): string {
  return `${recordId}.${signature(recordId, secret)}`;
}

export function verifyResubscribeToken(token: string, secret: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const recordId = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(signature(recordId, secret));
  return given.length === expected.length && timingSafeEqual(given, expected)
    ? recordId
    : null;
}

/**
 * Whole days from now until `renewsAt`, rounded up so the first charge is never
 * before the date Lemon Squeezy would have billed. 0 when the date has passed.
 */
export function trialDaysUntil(renewsAt: string | null | undefined, nowMs: number): number {
  const target = renewsAt ? Date.parse(renewsAt) : Number.NaN;
  if (!Number.isFinite(target) || target <= nowMs) return 0;
  return Math.min(365, Math.ceil((target - nowMs) / 86_400_000));
}
