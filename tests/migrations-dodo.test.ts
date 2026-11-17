import assert from "node:assert/strict";
import { test } from "node:test";
import { createInitialState } from "../src/lib/lemonsqueezy/import-engine";
import { DodoClient, dodoModeFromKey } from "../src/lib/migrations/dodo/client";
import { dodoStages, runDodoChunk } from "../src/lib/migrations/dodo/engine";
import { mapDodoDiscount, mapDodoPayment, mapDodoProduct, mapDodoSubscription } from "../src/lib/migrations/dodo/mappers";
import { memorySink, runAll } from "./helpers/memory-sink";

type R = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

test("mode comes from the key prefix, else the fallback", () => {
  assert.equal(dodoModeFromKey("dodo_test_abc"), "test");
  assert.equal(dodoModeFromKey("dodo_live_abc"), "live");
  assert.equal(dodoModeFromKey("whatever", "test"), "test");
});

const oneTime = (over: R = {}): R => ({
  product_id: "pdt_1", business_id: "biz", name: "Kit", description: "d", image: "https://i/1.png", is_recurring: false,
  price_detail: { type: "one_time_price", price: 2000, currency: "USD", pay_what_you_want: false },
  entitlements: [
    { id: "e1", integration_type: "digital_files", integration_config: { digital_files: { files: [{ file_id: "f1", filename: "kit.zip", download_url: "https://dl/f1", expires_in: 60, content_type: "application/zip", file_size: 5 }], instructions: "Unzip it" } } },
    { id: "e2", integration_type: "license_key", integration_config: { activations_limit: 2, duration_count: 1, duration_interval: "Year" } },
    { id: "e3", integration_type: "github", integration_config: { target_id: "acme/kit", permission: "pull" } },
    { id: "e4", integration_type: "discord", integration_config: { guild_id: "g" } },
  ],
  ...over,
});

test("product: entitlements become variant settings, files and notes", () => {
  const m = mapDodoProduct(oneTime(), new Set());
  assert.equal(m.product!.price, 2000);
  assert.equal(m.variant!.sourceId, "pdt_1");
  assert.equal(m.variant!.generateLicense, true);
  assert.equal(m.variant!.licenseSeatLimit, 2);
  assert.equal(m.variant!.licenseUpdatePeriodUnit, "year");
  assert.equal(m.variant!.githubRepoOwner, "acme");
  assert.equal(m.variant!.githubRepoName, "kit");
  assert.equal(m.variant!.deliveryContent, "Unzip it");
  assert.deepEqual(m.files.map((f) => f.filename), ["kit.zip"]);
  assert.ok(m.notes.some((n) => /discord/.test(n)));
});

test("product: PWYW, recurring with trial, usage-based skipped", () => {
  const pw = mapDodoProduct(oneTime({ entitlements: [], price_detail: { type: "one_time_price", price: 500, pay_what_you_want: true, suggested_price: 900 } }), new Set());
  assert.equal(pw.variant!.customAmountEnabled, true);
  assert.equal(pw.variant!.minPrice, 500);
  assert.equal(pw.variant!.suggestedPrice, 900);
  const rec = mapDodoProduct(oneTime({ entitlements: [], is_recurring: true, price_detail: { type: "recurring_price", price: 1500, payment_frequency_interval: "Month", payment_frequency_count: 1, trial_period_days: 7 } }), new Set());
  assert.equal(rec.variant!.billingType, "subscription");
  assert.equal(rec.variant!.intervalUnit, "month");
  assert.equal(rec.variant!.trialDays, 7);
  const usage = mapDodoProduct(oneTime({ price_detail: { type: "usage_based_price" } }), new Set());
  assert.equal(usage.product, null);
  assert.match(usage.notes[0], /usage-based/);
});

test("payment: refund status and product from cart", () => {
  const list = { payment_id: "pay_1", status: "succeeded", total_amount: 2000, currency: "usd", customer: { email: "A@X.com", name: "A" }, created_at: "2026-01-01T00:00:00Z", refund_status: null };
  const o = mapDodoPayment(list, { product_cart: [{ product_id: "pdt_1", quantity: 1 }] })!;
  assert.equal(o.productSourceId, "pdt_1");
  assert.equal(o.status, "paid");
  assert.equal(o.email, "a@x.com");
  assert.equal(mapDodoPayment({ ...list, refund_status: "partial" }, null)!.status, "refunded");
  assert.equal(mapDodoPayment({ ...list, status: "failed" }, null), null);
});

test("discount: basis points and restricted products", () => {
  const d = mapDodoDiscount({ discount_id: "dsc", code: "off", type: "percentage", amount: 540, usage_limit: 3, times_used: 1, restricted_to: ["pdt_1"] })!;
  assert.equal(d.value, 5.4);
  assert.deepEqual(d.productSourceIds, ["pdt_1"]);
  assert.equal(mapDodoDiscount({ discount_id: "x", code: null, amount: 1 }), null);
});

test("subscription: pending re-subscribe until a card export is confirmed", () => {
  const s = mapDodoSubscription({ subscription_id: "sub_1", status: "active", product_id: "pdt_1", product_name: "Kit", next_billing_date: "2027-01-01T00:00:00Z", customer: { customer_id: "cus_1", email: "a@x.com", name: "A" }, payment_method_id: "pm_dodo" })!;
  assert.equal(s.migrationState, "needs_resubscribe");
  assert.equal(s.paymentProcessor, "unknown");
  assert.equal(s.sourceCustomerId, "cus_1");
  assert.equal(s.billing, true);
  assert.equal(mapDodoSubscription({ subscription_id: "s", status: "cancelled", customer: { email: "a@x.com" } })!.billing, false);
  assert.equal(mapDodoSubscription({ subscription_id: "s", status: "active", cancel_at_next_billing_date: true, customer: { email: "a@x.com" } })!.billing, false);
});

// ---------------------------------------------------------------- engine
function fakeDodo(opts: { expireFirstDownload?: boolean } = {}) {
  const products = [oneTime(), oneTime({ product_id: "pdt_2", name: "Sub", entitlements: [], is_recurring: true, price_detail: { type: "recurring_price", price: 900, payment_frequency_interval: "Month", payment_frequency_count: 1 } }), oneTime({ product_id: "pdt_3", name: "Metered", entitlements: [], price_detail: { type: "usage_based_price" } })];
  const data: Record<string, R[]> = {
    "/products": products,
    "/customers": [{ customer_id: "cus_1", email: "a@x.com", name: "A" }, { customer_id: "cus_2", email: "b@x.com", name: "B" }],
    "/payments": Array.from({ length: 30 }, (_, i) => ({ payment_id: `pay_${i}`, status: "succeeded", total_amount: 2000, currency: "USD", customer: { email: "a@x.com", name: "A" }, created_at: "2026-01-01T00:00:00Z", refund_status: i === 1 ? "full" : null })),
    "/license_keys": [{ id: "lic_1", key: "AAAA-BBBB", status: "active", customer_id: "cus_1", product_id: "pdt_1", payment_id: "pay_0", activations_limit: 2, instances_count: 1, created_at: "2026-01-01T00:00:00Z" }, { id: "lic_2", key: "CCCC", status: "disabled", customer_id: "cus_gone", product_id: "pdt_1" }],
    "/license_key_instances": [{ id: "lki_1", name: "laptop", license_key_id: "lic_1", created_at: "2026-02-01T00:00:00Z" }],
    "/discounts": [{ discount_id: "dsc_1", code: "off", type: "percentage", amount: 1000, restricted_to: ["pdt_1"] }, { discount_id: "dsc_2", code: "lost", type: "flat", amount: 100, restricted_to: ["pdt_zzz"] }],
    "/subscriptions": [{ subscription_id: "sub_1", status: "active", product_id: "pdt_2", product_name: "Sub", next_billing_date: "2027-01-01T00:00:00Z", customer: { customer_id: "cus_1", email: "a@x.com", name: "A" } }],
  };
  const requests: string[] = [];
  let downloads = 0;
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    if (u.host === "dl") { downloads += 1; return opts.expireFirstDownload ? new Response("", { status: 403 }) : new Response("bytes"); }
    requests.push(`${u.pathname}${u.search}|${(init?.headers as R)?.Authorization}`);
    const prod = u.pathname.match(/^\/products\/(.+)$/);
    if (prod) return Response.json(products.find((p) => p.product_id === prod[1]));
    const pay = u.pathname.match(/^\/payments\/(.+)$/);
    if (pay) return Response.json({ payment_id: pay[1], product_cart: [{ product_id: "pdt_1", quantity: 1 }] });
    const cust = u.pathname.match(/^\/customers\/(.+)$/);
    if (cust) { const c = data["/customers"].find((x) => x.customer_id === cust[1]); return c ? Response.json(c) : new Response("", { status: 404 }); }
    let rows = data[u.pathname] ?? [];
    const lk = u.searchParams.get("license_key_id");
    if (lk) rows = rows.filter((r) => r.license_key_id === lk);
    const size = Number(u.searchParams.get("page_size")); const page = Number(u.searchParams.get("page_number"));
    return Response.json({ items: rows.slice(page * size, page * size + size) });
  }) as unknown as typeof fetch;
  const client = new DodoClient({ apiKey: "dodo_test_x", requestsPerMinute: 1e7, fetchImpl, sleep: async () => {} });
  return { client, requests, downloads: () => downloads };
}

const options = { lsStoreId: "default", stages: [...dodoStages] };

test("dodo: full import end to end", async () => {
  const { sink, t, files } = memorySink();
  const api = fakeDodo();
  const state = await runAll(runDodoChunk, createInitialState(), options, api.client, sink);
  assert.equal(state.stage, "done");
  assert.equal(t.products.size, 2, "usage-based skipped");
  assert.equal(state.counts.products.skipped, 1);
  assert.ok(state.errors.some((e) => /usage-based/.test(e.message)));
  assert.equal(t.variants.size, 2);
  assert.equal(t.customers.size, 2);
  assert.equal(t.orders.size, 30);
  assert.equal([...t.orders.values()].find((o) => o.sourceId === "pay_1")!.status, "refunded");
  assert.equal([...t.orders.values()][0].productName, "Kit", "name from imported product");
  assert.equal(state.counts.files.imported, 1);
  assert.deepEqual([...files.values()][0], ["kit.zip"]);
  assert.equal(api.downloads(), 1);
  const lic = [...t.licenses.values()].find((l) => l.key === "AAAA-BBBB")!;
  assert.equal((lic.instances as unknown[]).length, 1);
  assert.equal(lic.orderId, [...t.orders.values()].find((o) => o.sourceId === "pay_0")!.id);
  assert.equal(t.licenses.size, 1, "license with unresolvable customer skipped");
  assert.equal(state.counts.licenses.skipped, 1);
  const discounts = [...t.discounts.values()];
  assert.deepEqual(discounts.find((d) => d.code === "OFF")!.scope, [[...t.products.values()].find((p) => p.sourceId === "pdt_1")!.id]);
  assert.equal(discounts.find((d) => d.code === "LOST")!.active, false);
  assert.equal([...t.subscriptions.values()][0].migrationState, "needs_resubscribe");
  // test host and bearer
  assert.ok(api.requests.every((r) => r.endsWith("|Bearer dodo_test_x")));
});

test("dodo: uses zero-based pages and a fresh product object for each file", async () => {
  const mem = memorySink();
  const api = fakeDodo();
  await runAll(runDodoChunk, createInitialState(), { lsStoreId: "x", stages: ["products", "files"] }, api.client, mem.sink);
  assert.ok(api.requests.some((r) => r.startsWith("/products?page_size=25&page_number=0")));
  assert.ok(api.requests.some((r) => r.startsWith("/products/pdt_1")), "fresh product fetched for presigned urls");
});

test("dodo: expired presigned url records a failure and the import continues", async () => {
  const mem = memorySink();
  const api = fakeDodo({ expireFirstDownload: true });
  const state = await runAll(runDodoChunk, createInitialState(), options, api.client, mem.sink);
  assert.equal(state.counts.files.failed, 1);
  assert.match(state.errors.find((e) => e.stage === "files")!.message, /expired/);
  assert.equal(mem.t.orders.size, 30);
});

test("dodo: re-run is idempotent and does not re-download files", async () => {
  const mem = memorySink();
  const api = fakeDodo();
  await runAll(runDodoChunk, createInitialState(), options, api.client, mem.sink);
  const sizes = Object.fromEntries(Object.entries(mem.t).map(([k, v]) => [k, v.size]));
  const again = await runAll(runDodoChunk, createInitialState(), options, api.client, mem.sink);
  assert.deepEqual(Object.fromEntries(Object.entries(mem.t).map(([k, v]) => [k, v.size])), sizes);
  assert.equal(api.downloads(), 1);
  assert.equal(again.counts.orders.imported, 0);
});
