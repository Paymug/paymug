import assert from "node:assert/strict";
import { test } from "node:test";
import {
  planStripeLinks, summarizePlan,
  type PendingSubscription, type StripeCardCustomer,
} from "../src/lib/lemonsqueezy/subscription-linking";

const NOW = Date.parse("2026-12-01T00:00:00Z");
const price = { amountCents: 1500, currency: "USD", interval: "month" as const, intervalCount: 1 };
const sub = (over: Partial<PendingSubscription> = {}): PendingSubscription => ({
  recordId: "r1", email: "a@x.com", productName: "Kit", variantName: "Pro",
  renewsAt: "2027-01-01T00:00:00Z", cardLast4: "4242", price, ...over,
});
const cust = (over: Partial<StripeCardCustomer> = {}): StripeCardCustomer => ({
  customerId: "cus_1", paymentMethodId: "pm_1", last4: "4242", ...over,
});
const plan = (s: PendingSubscription, c: StripeCardCustomer[]) =>
  planStripeLinks([s], new Map([["a@x.com", c]]), NOW)[0];

test("ready: exactly one customer with matching card, future renewal", () => {
  const p = plan(sub(), [cust()]);
  assert.equal(p.action, "create");
  assert.equal(p.customerId, "cus_1");
  assert.equal(p.paymentMethodId, "pm_1");
  assert.equal(p.firstChargeAt, Date.parse("2027-01-01T00:00:00Z") / 1000);
  assert.equal(p.amountCents, 1500);
});

test("waiting when no customer or no payment method", () => {
  assert.equal(planStripeLinks([sub()], new Map(), NOW)[0].action, "waiting");
  assert.equal(plan(sub(), [cust({ paymentMethodId: null })]).action, "waiting");
});

test("ambiguous email goes to manual review", () => {
  const p = plan(sub(), [cust(), cust({ customerId: "cus_2", paymentMethodId: "pm_2" })]);
  assert.equal(p.action, "manual_review"); assert.match(p.reason, /2 Stripe customers/);
});

test("card mismatch, past renewal and unpriced variant are reviewed, never created", () => {
  assert.equal(plan(sub(), [cust({ last4: "1111" })]).action, "manual_review");
  assert.equal(plan(sub({ renewsAt: "2026-11-01T00:00:00Z" }), [cust()]).action, "manual_review");
  assert.equal(plan(sub({ renewsAt: null }), [cust()]).action, "manual_review");
  assert.equal(plan(sub({ price: null }), [cust()]).action, "manual_review");
});

test("unknown last4 on either side does not block", () => {
  assert.equal(plan(sub({ cardLast4: null }), [cust()]).action, "create");
  assert.equal(plan(sub(), [cust({ last4: null })]).action, "create");
});

test("email match is case-insensitive; summary totals planned charges", () => {
  const items = planStripeLinks(
    [sub({ email: "A@X.com" }), sub({ recordId: "r2", email: "b@x.com" })],
    new Map([["a@x.com", [cust()]]]),
    NOW,
  );
  assert.deepEqual(summarizePlan(items), { create: 1, waiting: 1, manualReview: 0, plannedAmountCents: 1500 });
});
