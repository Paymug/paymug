import assert from "node:assert/strict";
import { test } from "node:test";
import { planStripeLinks, type PendingSubscription } from "../src/lib/lemonsqueezy/subscription-linking";
import { migrationSources, normalizeSourceStages, isMigrationSource } from "../src/lib/migrations/sources";
import { MappingParseError, matchMapping, parseCsv, parseStripeMappingCsv } from "../src/lib/migrations/stripe-import-mapping";

test("csv: quotes, escaped quotes, CRLF, BOM, blank lines", () => {
  const rows = parseCsv('﻿a,b\r\n"x,1","he said ""hi"""\r\n\r\nlast,row');
  assert.deepEqual(rows, [["a", "b"], ["x,1", 'he said "hi"'], ["last", "row"]]);
});

test("mapping: paddle-style headers", () => {
  const rows = parseStripeMappingCsv(
    "Paddle Customer ID,Paddle Payment Method ID,Stripe Customer ID,Stripe Payment Method ID\nctm_1,paymtd_1,cus_AAA,pm_AAA\nctm_2,paymtd_2,cus_BBB,\n,,cus_skip,pm_skip\nctm_3,paymtd_3,notstripe,pm_x\n",
  );
  assert.deepEqual(rows, [
    { sourceCustomerId: "ctm_1", sourcePaymentMethodId: "paymtd_1", stripeCustomerId: "cus_AAA", stripePaymentMethodId: "pm_AAA" },
    { sourceCustomerId: "ctm_2", sourcePaymentMethodId: "paymtd_2", stripeCustomerId: "cus_BBB", stripePaymentMethodId: null },
  ]);
});

test("mapping: dodo cus_ source ids do not collide with stripe ids (header based)", () => {
  const rows = parseStripeMappingCsv("source_customer_id,stripe_customer_id,stripe_payment_method_id\ncus_dodo1,cus_stripe1,pm_1\n");
  assert.equal(rows[0].sourceCustomerId, "cus_dodo1");
  assert.equal(rows[0].stripeCustomerId, "cus_stripe1");
});

test("mapping: unusable files raise a parse error", () => {
  assert.throws(() => parseStripeMappingCsv("only header"), MappingParseError);
  assert.throws(() => parseStripeMappingCsv("a,b\n1,2\n"), MappingParseError);
});

test("matchMapping: by customer, payment method wins, unmatched reported", () => {
  const rows = [
    { sourceCustomerId: "c1", sourcePaymentMethodId: "m1", stripeCustomerId: "cus_1", stripePaymentMethodId: "pm_1" },
    { sourceCustomerId: "c1", sourcePaymentMethodId: "m2", stripeCustomerId: "cus_1", stripePaymentMethodId: "pm_2" },
    { sourceCustomerId: "c2", sourcePaymentMethodId: null, stripeCustomerId: "cus_2", stripePaymentMethodId: "pm_3" },
  ];
  const { matched, unmatched } = matchMapping(
    [
      { recordId: "r1", sourceCustomerId: "c1", sourcePaymentMethodId: "m2" },
      { recordId: "r2", sourceCustomerId: "c2", sourcePaymentMethodId: "mx" },
      { recordId: "r3", sourceCustomerId: "c9", sourcePaymentMethodId: null },
      { recordId: "r4", sourceCustomerId: null, sourcePaymentMethodId: null },
    ],
    rows,
  );
  assert.equal(matched.get("r1")!.stripePaymentMethodId, "pm_2");
  assert.equal(matched.get("r2")!.stripeCustomerId, "cus_2");
  assert.deepEqual(unmatched, ["r3", "r4"]);
});

const sub = (over: Partial<PendingSubscription> = {}): PendingSubscription => ({
  recordId: "r1", email: "a@x.com", productName: "Kit", variantName: null, renewsAt: "2099-01-01T00:00:00Z", cardLast4: null,
  price: { amountCents: 900, currency: "USD", interval: "month", intervalCount: 1 }, ...over,
});

test("planStripeLinks: exact mapped ids beat email lookup, even with zero or many email matches", () => {
  const now = Date.parse("2026-11-17T00:00:00Z");
  const mapped = new Map([["r1", { customerId: "cus_X", paymentMethodId: "pm_X", last4: null }]]);
  const plan = planStripeLinks([sub()], new Map(), now, { mapped, sourceLabel: "Paddle" })[0];
  assert.equal(plan.action, "create");
  assert.equal(plan.customerId, "cus_X");
  assert.equal(plan.paymentMethodId, "pm_X");
  const many = new Map([["a@x.com", [{ customerId: "c1", paymentMethodId: "p1", last4: null }, { customerId: "c2", paymentMethodId: "p2", last4: null }]]]);
  assert.equal(planStripeLinks([sub()], many, now)[0].action, "manual_review");
  assert.equal(planStripeLinks([sub()], many, now, { mapped })[0].customerId, "cus_X");
});

test("planStripeLinks: mapping without a payment method waits; messages name the source", () => {
  const now = Date.parse("2026-11-17T00:00:00Z");
  const mapped = new Map([["r1", { customerId: "cus_X", paymentMethodId: null, last4: null }]]);
  assert.equal(planStripeLinks([sub()], new Map(), now, { mapped })[0].action, "waiting");
  const mismatch = new Map([["r1", { customerId: "cus_X", paymentMethodId: "pm_X", last4: "1111" }]]);
  const item = planStripeLinks([sub({ cardLast4: "4242" })], new Map(), now, { mapped: mismatch, sourceLabel: "Paddle" })[0];
  assert.match(item.reason, /ends 1111 in Stripe but 4242 in Paddle/);
  assert.equal(planStripeLinks([sub({ renewsAt: "2020-01-01T00:00:00Z" })], new Map(), now, { mapped: mismatch })[0].action, "manual_review");
});

test("source registry: stages per source, products always included, unknown rejected", () => {
  assert.equal(isMigrationSource("polar"), true);
  assert.equal(isMigrationSource("gumroad"), false);
  assert.deepEqual(normalizeSourceStages("paddle", ["licenses", "files", "orders"]), ["products", "orders"], "paddle has no licenses/files");
  assert.deepEqual(normalizeSourceStages("polar", undefined), migrationSources.polar.stages);
  assert.deepEqual(normalizeSourceStages("dodo", ["files"]), ["products", "files"]);
  assert.ok(migrationSources.lemonsqueezy.stages.includes("affiliates"));
  assert.ok(!migrationSources.polar.stages.includes("files"));
});
