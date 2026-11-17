import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dedupeCustomers, mapAffiliate, mapCustomer, mapDiscount, mapFile, mapLicense,
  mapOrder, mapProduct, mapSubscription, mapVariant, slugify, uniqueSlug,
} from "../src/lib/lemonsqueezy/mappers";

const r = (id: string, type: string, attributes: Record<string, unknown>) => ({ id, type, attributes });

test("slugify + uniqueSlug", () => {
  assert.equal(slugify("Héllo  World!"), "hello-world");
  assert.equal(slugify("!!!", "x"), "x");
  const used = new Set<string>(["a"]);
  assert.equal(uniqueSlug("a", used), "a-2");
  assert.equal(uniqueSlug("a", used), "a-3");
});

test("product maps status/price/slug collisions", () => {
  const used = new Set<string>();
  const p1 = mapProduct(r("1", "products", { name: "Kit", slug: "kit", price: 900, status: "published", store_id: 3 }), used);
  const p2 = mapProduct(r("2", "products", { name: "Kit", slug: "kit", status: "draft" }), used);
  assert.equal(p1.slug, "kit"); assert.equal(p2.slug, "kit-2");
  assert.equal(p1.status, "published"); assert.equal(p2.status, "draft");
  assert.equal(p1.price, 900); assert.equal(p2.price, 0);
});

test("variant maps subscription, trial, PWYW and license", () => {
  const v = mapVariant(r("5", "variants", {
    product_id: 1, name: "Monthly", is_subscription: true, interval: "month", interval_count: 1,
    has_free_trial: true, trial_interval: "week", trial_interval_count: 2, price: 1500,
    pay_what_you_want: true, min_price: 500, suggested_price: 2000, status: "published",
    has_license_keys: true, license_activation_limit: 3, is_license_limit_unlimited: false,
    license_length_unit: "years", license_length_value: 1, is_license_length_unlimited: false, sort: 2,
  }), new Set());
  assert.equal(v.billingType, "subscription");
  assert.equal(v.intervalUnit, "month");
  assert.equal(v.trialDays, 14);
  assert.equal(v.customAmountEnabled, true);
  assert.equal(v.minPrice, 500); assert.equal(v.suggestedPrice, 2000);
  assert.equal(v.licenseSeatLimit, 3);
  assert.equal(v.licenseType, "standard");
  assert.equal(v.licenseUpdatePeriodUnit, "year");
  assert.equal(v.productSourceId, "1");
});

test("variant: one-time, unlimited lifetime license, no license inherits", () => {
  const v = mapVariant(r("6", "variants", {
    product_id: 1, name: "Lifetime", is_subscription: false, price: 4900, status: "published",
    has_license_keys: true, is_license_limit_unlimited: true, is_license_length_unlimited: true,
  }), new Set());
  assert.equal(v.billingType, "one_time");
  assert.equal(v.licenseSeatLimit, null);
  assert.equal(v.licenseType, "perpetual");
  const none = mapVariant(r("7", "variants", { product_id: 1, name: "Plain", price: 1 }), new Set());
  assert.equal(none.licenseSeatLimit, undefined);
  assert.equal(none.generateLicense, false);
  assert.equal(none.customAmountEnabled, null, "off PWYW inherits instead of overriding");
});

test("file adds extension and mime", () => {
  const f = mapFile(r("9", "files", { variant_id: 5, name: "guide", extension: "pdf", size: 10, version: "1.0", sort: 1, download_url: "https://d" }));
  assert.equal(f.name, "guide.pdf"); assert.equal(f.type, "application/pdf"); assert.equal(f.variantSourceId, "5");
  assert.equal(mapFile(r("1", "files", { variant_id: 1, name: "a.zip", extension: "zip" })).name, "a.zip");
});

test("customers dedupe by lowercase email; missing email dropped", () => {
  assert.equal(mapCustomer(r("1", "customers", { name: "x" })), null);
  const a = mapCustomer(r("1", "customers", { email: "A@x.com", name: "A" }))!;
  const b = mapCustomer(r("2", "customers", { email: "a@X.com", name: "B" }))!;
  const out = dedupeCustomers([a, b]);
  assert.equal(out.length, 1); assert.equal(out[0].name, "A");
});

test("order maps first_order_item, statuses, lowercases email", () => {
  const o = mapOrder(r("10", "orders", {
    user_email: "Buyer@X.com", user_name: "Buy", currency: "usd", total: 1200, discount_total: 100, status: "partial_refund",
    created_at: "2026-01-01T00:00:00Z", first_order_item: { product_id: 1, variant_id: 5, product_name: "Kit", variant_name: "Pro" },
  }))!;
  assert.equal(o.email, "buyer@x.com"); assert.equal(o.status, "refunded");
  assert.equal(o.variantSourceId, "5"); assert.equal(o.currency, "USD"); assert.equal(o.paidAt, "2026-01-01T00:00:00Z");
  assert.equal(mapOrder(r("11", "orders", { status: "paid" })), null);
  assert.equal(mapOrder(r("12", "orders", { user_email: "a@b.c", status: "pending" }))!.paidAt, null);
});

test("license keeps full key; 0 activations = unlimited; disabled inactive", () => {
  const l = mapLicense(r("1", "license-keys", { key: "ABCD-1234", user_email: "a@b.c", activation_limit: 0, disabled: true, order_id: 10 }))!;
  assert.equal(l.key, "ABCD-1234"); assert.equal(l.activationLimit, null); assert.equal(l.status, "inactive"); assert.equal(l.orderSourceId, "10");
  assert.equal(mapLicense(r("2", "license-keys", { user_email: "a@b.c" })), null);
});

test("discount percent vs fixed (cents -> major)", () => {
  const p = mapDiscount(r("1", "discounts", { code: "save10", amount: 10, amount_type: "percent", is_limited_redemptions: true, max_redemptions: 5 }))!;
  assert.equal(p.code, "SAVE10"); assert.equal(p.type, "percentage"); assert.equal(p.value, 10); assert.equal(p.usageLimit, 5);
  const f = mapDiscount(r("2", "discounts", { code: "five", amount: 500, amount_type: "fixed" }))!;
  assert.equal(f.type, "fixed"); assert.equal(f.value, 5);
  assert.equal(mapDiscount(r("3", "discounts", { amount: 1 })), null);
});

test("affiliate unique codes", () => {
  const used = new Set<string>();
  const a = mapAffiliate(r("1", "affiliates", { user_email: "bob@x.com", user_name: "Bob", status: "active", total_earnings: 1000 }), used)!;
  const b = mapAffiliate(r("2", "affiliates", { user_email: "bob@y.com" }), used)!;
  assert.equal(a.code, "bob"); assert.equal(b.code, "bob-2"); assert.equal(a.totalEarnings, 10); assert.equal(b.status, "inactive");
});

test("subscription flags billing and processor", () => {
  const s = mapSubscription(r("1", "subscriptions", { user_email: "A@b.c", status: "active", payment_processor: "stripe", card_last_four: "4242", renews_at: "2027-01-01T00:00:00Z" }))!;
  assert.equal(s.billing, true); assert.equal(s.paymentProcessor, "stripe"); assert.equal(s.cardLast4, "4242"); assert.equal(s.email, "a@b.c");
  assert.equal(mapSubscription(r("2", "subscriptions", { user_email: "a@b.c", status: "cancelled" }))!.billing, false);
});
