import assert from "node:assert/strict";
import { test } from "node:test";
import { signResubscribeToken, trialDaysUntil, verifyResubscribeToken } from "../src/lib/lemonsqueezy/resubscribe";

test("token round-trips and rejects tampering or another secret", () => {
  const token = signResubscribeToken("rec-1", "s3cret");
  assert.equal(verifyResubscribeToken(token, "s3cret"), "rec-1");
  assert.equal(verifyResubscribeToken(token, "other"), null);
  assert.equal(verifyResubscribeToken(token.replace("rec-1", "rec-2"), "s3cret"), null);
  assert.equal(verifyResubscribeToken(token + "x", "s3cret"), null);
  assert.equal(verifyResubscribeToken("nodot", "s3cret"), null);
  assert.equal(verifyResubscribeToken("", "s3cret"), null);
});

test("trial days round up, clamp, and are 0 for past or invalid dates", () => {
  const now = Date.parse("2026-12-01T00:00:00Z");
  assert.equal(trialDaysUntil("2026-12-31T00:00:00Z", now), 30);
  assert.equal(trialDaysUntil("2026-12-31T06:00:00Z", now), 31);
  assert.equal(trialDaysUntil("2026-11-01T00:00:00Z", now), 0);
  assert.equal(trialDaysUntil(null, now), 0);
  assert.equal(trialDaysUntil("garbage", now), 0);
  assert.equal(trialDaysUntil("2030-01-01T00:00:00Z", now), 365);
});
