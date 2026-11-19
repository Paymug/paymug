import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mapStripeSubscriptionStatus,
  stripeInvoiceOrderId,
} from "../src/lib/stripe-subscription.utils";

test("Stripe subscription statuses map to Paymug statuses", () => {
  assert.equal(mapStripeSubscriptionStatus("active"), "active");
  assert.equal(mapStripeSubscriptionStatus("trialing"), "trialing");
  assert.equal(mapStripeSubscriptionStatus("past_due"), "past_due");
  assert.equal(mapStripeSubscriptionStatus("unpaid"), "suspended");
  assert.equal(mapStripeSubscriptionStatus("paused"), "paused");
  assert.equal(mapStripeSubscriptionStatus("canceled"), "cancelled");
  assert.equal(mapStripeSubscriptionStatus("incomplete_expired"), "expired");
});

test("transient Stripe statuses leave the record alone", () => {
  assert.equal(mapStripeSubscriptionStatus("incomplete"), undefined);
  assert.equal(mapStripeSubscriptionStatus("something_new"), undefined);
});

test("invoice order ids are deterministic for webhook redelivery", () => {
  assert.equal(stripeInvoiceOrderId("in_123"), stripeInvoiceOrderId("in_123"));
  assert.notEqual(stripeInvoiceOrderId("in_123"), stripeInvoiceOrderId("in_124"));
});

test("subscription Checkout Session carries recurring, trial and discount params", async () => {
  const { createStripeCheckoutSession } = await import("../src/lib/stripe");
  const original = globalThis.fetch;
  const bodies: Record<string, URLSearchParams> = {};
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    bodies[new URL(url).pathname] = init?.body as URLSearchParams;
    return new Response(JSON.stringify({ id: "cs_1", url: "https://x", metadata: {} }));
  }) as typeof fetch;
  try {
    await createStripeCheckoutSession({
      secretKey: "sk_test_x",
      mode: "sandbox",
      orderId: "o1",
      productName: "Pro",
      amountCents: 1000,
      currency: "USD",
      customerEmail: "a@x.com",
      successUrl: "https://s",
      cancelUrl: "https://c",
      subscription: {
        interval: "month",
        intervalCount: 3,
        trialDays: 7,
        discount: { amountOffCents: 200, duration: "once" },
      },
    });
    const session = bodies["/v1/checkout/sessions"];
    assert.equal(session.get("mode"), "subscription");
    assert.equal(session.get("line_items[0][price_data][recurring][interval]"), "month");
    assert.equal(session.get("line_items[0][price_data][recurring][interval_count]"), "3");
    assert.equal(session.get("subscription_data[trial_period_days]"), "7");
    assert.equal(session.get("subscription_data[metadata][orderId]"), "o1");
    assert.ok(session.get("discounts[0][coupon]"));
  } finally {
    globalThis.fetch = original;
  }
});
