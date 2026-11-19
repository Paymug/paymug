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
