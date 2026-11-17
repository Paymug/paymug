import assert from "node:assert/strict";
import { test } from "node:test";
import { createInitialState, toIdMapCsv } from "../src/lib/lemonsqueezy/import-engine";
import { PolarClient } from "../src/lib/migrations/polar/client";
import { runPolarChunk, polarStages } from "../src/lib/migrations/polar/engine";
import { mapPolarDiscount, mapPolarLicense, mapPolarOrder, mapPolarProduct, mapPolarSubscription } from "../src/lib/migrations/polar/mappers";
import { memorySink, runAll } from "./helpers/memory-sink";

type R = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const product = (over: R = {}): R => ({
  id: "p1", name: "Pro Kit", description: "d", is_recurring: false, is_archived: false, recurring_interval: null,
  recurring_interval_count: null, trial_interval: null, trial_interval_count: null, organization_id: "org1",
  medias: [{ public_url: "https://img/1.png" }],
  prices: [{ id: "pr1", amount_type: "fixed", price_amount: 1900, price_currency: "usd", is_archived: false }],
  benefits: [
    { id: "b1", type: "license_keys", properties: { prefix: "K", activations: { limit: 3, enable_customer_admin: true }, expires: { ttl: 1, timeframe: "year" } } },
    { id: "b2", type: "github_repository", properties: { repository_owner: "acme", repository_name: "kit", permission: "pull" } },
    { id: "b3", type: "downloadables", properties: { files: ["f1", "f2"] } },
    { id: "b4", type: "discord", properties: {} },
    { id: "b5", type: "custom", properties: { note: "Welcome!" } },
  ],
  ...over,
});

test("product with multiple price types becomes variants with benefit settings", () => {
  const mapped = mapPolarProduct(
    product({
      is_recurring: true, recurring_interval: "month", recurring_interval_count: 1, trial_interval: "week", trial_interval_count: 2,
      prices: [
        { id: "a", amount_type: "fixed", price_amount: 1000, price_currency: "usd", is_archived: false },
        { id: "b", amount_type: "custom", minimum_amount: 500, preset_amount: 900, price_currency: "usd", is_archived: false },
        { id: "c", amount_type: "free", price_currency: "usd", is_archived: false },
        { id: "d", amount_type: "metered_unit", price_currency: "usd", is_archived: false },
        { id: "e", amount_type: "fixed", price_amount: 5, price_currency: "usd", is_archived: true },
      ],
    }),
    new Set(),
  );
  assert.deepEqual(mapped.variants.map((v) => v.sourceId), ["a", "b", "c"], "metered and archived skipped when active exist");
  const [fixed, custom, free] = mapped.variants;
  assert.equal(fixed.price, 1000);
  assert.equal(fixed.billingType, "subscription");
  assert.equal(fixed.intervalUnit, "month");
  assert.equal(fixed.trialDays, 14);
  assert.equal(custom.customAmountEnabled, true);
  assert.equal(custom.minPrice, 500);
  assert.equal(custom.suggestedPrice, 900);
  assert.equal(free.price, 0);
  assert.equal(fixed.generateLicense, true);
  assert.equal(fixed.licenseSeatLimit, 3);
  assert.equal(fixed.licenseUpdatePeriodUnit, "year");
  assert.equal(fixed.licenseType, "standard");
  assert.equal(fixed.githubRepoOwner, "acme");
  assert.equal(fixed.githubRepoName, "kit");
  assert.equal(fixed.deliveryContent, "Welcome!");
  assert.equal(mapped.product.price, 0, "lowest variant price");
  assert.ok(mapped.notes.some((n) => /metered/.test(n.message)));
  assert.ok(mapped.notes.some((n) => /downloadable/.test(n.message)));
  assert.ok(mapped.notes.some((n) => /Discord/.test(n.message)));
  assert.deepEqual(mapped.benefitIds, ["b1", "b2", "b3", "b4", "b5"]);
});

test("single price keeps product name; archived product is draft; slugs unique", () => {
  const used = new Set<string>();
  const a = mapPolarProduct(product({ is_archived: true }), used);
  const b = mapPolarProduct(product({ id: "p2" }), used);
  assert.equal(a.product.status, "draft");
  assert.equal(a.variants[0].name, "Pro Kit");
  assert.equal(a.variants[0].status, "draft");
  assert.equal(a.product.slug, "pro-kit");
  assert.equal(b.product.slug, "pro-kit-2");
});

test("license without activations block is unlimited; no license => inherit", () => {
  const unlimited = mapPolarProduct(product({ benefits: [{ id: "b", type: "license_keys", properties: { activations: null, expires: null } }] }), new Set());
  assert.equal(unlimited.variants[0].licenseSeatLimit, null);
  assert.equal(unlimited.variants[0].licenseType, "perpetual");
  const none = mapPolarProduct(product({ benefits: [] }), new Set());
  assert.equal(none.variants[0].licenseSeatLimit, undefined);
  assert.equal(none.variants[0].generateLicense, null);
});

test("orders: status mapping and price id as variant", () => {
  const base = { id: "o", created_at: "2026-01-01T00:00:00Z", total_amount: 1900, discount_amount: 100, currency: "usd", product_id: "p1", customer: { email: "A@X.com", name: "A" }, items: [{ product_price_id: "pr1", label: "Pro" }], product: { name: "Pro Kit" } };
  assert.equal(mapPolarOrder({ ...base, status: "paid" })!.status, "paid");
  assert.equal(mapPolarOrder({ ...base, status: "partially_refunded" })!.status, "refunded");
  assert.equal(mapPolarOrder({ ...base, status: "void" })!.status, "failed");
  assert.equal(mapPolarOrder({ ...base, status: "pending" })!.status, "pending");
  const o = mapPolarOrder({ ...base, status: "paid" })!;
  assert.equal(o.email, "a@x.com");
  assert.equal(o.variantSourceId, "pr1");
  assert.equal(o.currency, "USD");
  assert.equal(mapPolarOrder({ ...base, customer: {}, status: "paid" }), null);
});

test("licenses: full key kept, masked key refused, status mapping", () => {
  const base = { id: "l", key: "AAAA-BBBB", display_key: "****-BBBB", customer: { email: "a@x.com" }, benefit_id: "b1", status: "granted", limit_activations: 3 };
  const bp = { b1: "p1" };
  const ok = mapPolarLicense(base, bp)!;
  assert.equal(ok.key, "AAAA-BBBB");
  assert.equal(ok.productSourceId, "p1");
  assert.equal(ok.activationLimit, 3);
  assert.equal(ok.status, "active");
  assert.equal(mapPolarLicense({ ...base, status: "revoked" }, bp)!.status, "inactive");
  assert.equal(mapPolarLicense({ ...base, key: "****-BBBB", display_key: "****-BBBB" }, bp), null);
});

test("discounts: basis points and fixed cents", () => {
  const pct = mapPolarDiscount({ id: "d", code: "save", type: "percentage", basis_points: 2500, redemptions_count: 2, max_redemptions: 10 }, [])!;
  assert.equal(pct.type, "percentage");
  assert.equal(pct.value, 25);
  assert.equal(pct.code, "SAVE");
  const fixed = mapPolarDiscount({ id: "d2", code: "x", type: "fixed", amount: 500, ends_at: "2000-01-01T00:00:00Z" }, ["p1"])!;
  assert.equal(fixed.value, 5);
  assert.equal(fixed.active, false);
  assert.equal(fixed.limitedToProducts, true);
  assert.equal(mapPolarDiscount({ id: "d3", type: "fixed", amount: 1 }, []), null);
});

test("subscriptions: billing flag and card-copy migration state", () => {
  const base = { id: "s", status: "active", current_period_end: "2027-01-01T00:00:00Z", customer_id: "c1", customer: { email: "a@x.com" }, product_id: "p1", prices: [{ id: "pr1" }], product: { name: "Pro Kit" } };
  const s = mapPolarSubscription(base)!;
  assert.equal(s.billing, true);
  assert.equal(s.paymentProcessor, "stripe");
  assert.equal(s.migrationState, "waiting_for_cards");
  assert.equal(s.sourceCustomerId, "c1");
  assert.equal(s.variantSourceId, "pr1");
  assert.equal(mapPolarSubscription({ ...base, status: "canceled" })!.billing, false);
  assert.equal(mapPolarSubscription({ ...base, cancel_at_period_end: true })!.billing, false);
});

// ---------------------------------------------------------------- engine
function fakePolar(opts: { pageLimit?: number } = {}) {
  const data: Record<string, R[]> = {
    "/v1/products/": [product(), product({ id: "p2", name: "Pro Kit", benefits: [], prices: [{ id: "pr2", amount_type: "fixed", price_amount: 500, price_currency: "usd", is_archived: false }] })],
    "/v1/customers/": [{ id: "c1", email: "A@x.com", name: "A" }, { id: "c2", email: "a@x.com", name: "dup" }, { id: "c3", email: null }],
    "/v1/orders/": [
      { id: "o1", status: "paid", total_amount: 1900, discount_amount: 0, currency: "usd", product_id: "p1", customer: { email: "a@x.com" }, items: [{ product_price_id: "pr1", label: "x" }], created_at: "2026-01-01T00:00:00Z" },
      { id: "o2", status: "paid", total_amount: 1, currency: "usd", product_id: "gone", customer: { email: "b@x.com" }, items: [] },
    ],
    "/v1/license-keys/": [{ id: "l1", key: "KEY-1", display_key: "***-1", customer: { email: "a@x.com" }, benefit_id: "b1", status: "granted", limit_activations: 3 }],
    "/v1/discounts/": [
      { id: "d1", code: "five", type: "fixed", amount: 500, products: [] },
      { id: "d2", code: "scoped", type: "percentage", basis_points: 1000, products: [{ id: "unknown" }] },
      { id: "d3", code: "ok", type: "percentage", basis_points: 1000, products: [{ id: "p1" }] },
    ],
    "/v1/subscriptions/": [{ id: "s1", status: "active", current_period_end: "2027-01-01T00:00:00Z", customer_id: "c1", customer: { email: "a@x.com" }, product_id: "p1", prices: [{ id: "pr1" }], product: { name: "Pro Kit" } }],
  };
  const requests: string[] = [];
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    requests.push(`${u.pathname}${u.search}|${(init?.headers as R)?.Authorization}`);
    const detail = u.pathname.match(/^\/v1\/license-keys\/(.+)$/);
    if (detail) return Response.json({ ...data["/v1/license-keys/"].find((l) => l.id === detail[1]), activations: [{ id: "act1", label: "laptop", created_at: "2026-02-01T00:00:00Z" }] });
    const rows = data[u.pathname] ?? [];
    const limit = Number(u.searchParams.get("limit"));
    const page = Number(u.searchParams.get("page"));
    return Response.json({ items: rows.slice((page - 1) * limit, page * limit), pagination: { total_count: rows.length, max_page: Math.max(1, Math.ceil(rows.length / limit)) } });
  }) as unknown as typeof fetch;
  void opts;
  return { client: new PolarClient({ token: "polar_oat_x", mode: "test", requestsPerMinute: 1e7, fetchImpl, sleep: async () => {} }), requests };
}

const options = { lsStoreId: "org1", stages: [...polarStages] };

test("polar: full import end to end", async () => {
  const { sink, t } = memorySink();
  const { client, requests } = fakePolar();
  const state = await runAll(runPolarChunk, createInitialState(), options, client, sink);
  assert.equal(state.stage, "done");
  assert.equal(t.products.size, 2);
  assert.deepEqual([...t.products.values()].map((p) => p.slug).sort(), ["pro-kit", "pro-kit-2"]);
  assert.equal(t.variants.size, 2);
  assert.equal(t.customers.size, 1);
  assert.equal(state.counts.customers.skipped, 1, "no-email customer skipped");
  assert.equal(t.orders.size, 1);
  assert.equal(state.counts.orders.failed, 1);
  const order = [...t.orders.values()][0];
  assert.equal(order.variantId, [...t.variants.values()].find((v) => v.sourceId === "pr1")!.id);
  const lic = [...t.licenses.values()][0];
  assert.equal(lic.key, "KEY-1");
  assert.equal(lic.productId, [...t.products.values()].find((p) => p.sourceId === "p1")!.id, "benefit -> product");
  assert.equal((lic.instances as unknown[]).length, 1);
  assert.equal(t.subscriptions.size, 1);
  const discounts = [...t.discounts.values()];
  assert.equal(discounts.find((d) => d.code === "FIVE")!.scope, "all");
  assert.equal(discounts.find((d) => d.code === "SCOPED")!.active, false);
  const ok = discounts.find((d) => d.code === "OK")!;
  assert.deepEqual(ok.scope, [[...t.products.values()].find((p) => p.sourceId === "p1")!.id]);
  assert.ok(state.errors.some((e) => /downloadable/.test(e.message)), "files-missing note recorded");
  assert.ok(requests.every((r) => r.endsWith("|Bearer polar_oat_x")));
  assert.ok(requests.filter((r) => r.includes("/products/")).every((r) => r.includes("organization_id=org1")));
  assert.match(toIdMapCsv(state, "polar"), /type,polar_id,paymug_id/);
});

test("polar: re-run is idempotent; resume from mid-job state works", async () => {
  const mem = memorySink();
  const { client } = fakePolar();
  let state = createInitialState();
  for (let i = 0; i < 3; i += 1) state = (await runPolarChunk(state, options, client, mem.sink)).state;
  const final = await runAll(runPolarChunk, JSON.parse(JSON.stringify(state)), options, client, mem.sink);
  const sizes = Object.fromEntries(Object.entries(mem.t).map(([k, v]) => [k, v.size]));
  const again = await runAll(runPolarChunk, createInitialState(), options, client, mem.sink);
  assert.deepEqual(Object.fromEntries(Object.entries(mem.t).map(([k, v]) => [k, v.size])), sizes);
  assert.equal(final.stage, "done");
  assert.equal(again.counts.products.imported, 0);
  assert.equal(again.counts.products.skipped, 2);
});

test("polar: pagination across pages at small limits and stage selection", async () => {
  const mem = memorySink();
  const rows = Array.from({ length: 230 }, (_, i) => ({ id: `c${i}`, email: `u${i}@x.com`, name: "n" }));
  const fetchImpl = (async (url: string) => {
    const u = new URL(url);
    const limit = Number(u.searchParams.get("limit")); const page = Number(u.searchParams.get("page"));
    const all = u.pathname === "/v1/customers/" ? rows : [];
    return Response.json({ items: all.slice((page - 1) * limit, page * limit), pagination: { total_count: all.length, max_page: Math.max(1, Math.ceil(all.length / limit)) } });
  }) as unknown as typeof fetch;
  const client = new PolarClient({ token: "t", mode: "live", requestsPerMinute: 1e7, fetchImpl, sleep: async () => {} });
  const state = await runAll(runPolarChunk, createInitialState(), { lsStoreId: "o", stages: ["products", "customers"] }, client, mem.sink);
  assert.equal(mem.t.customers.size, 230);
  assert.equal(mem.t.orders, undefined);
  assert.equal(state.counts.customers.imported, 230);
});

test("polar client: sandbox vs live base url and rate", async () => {
  const urls: string[] = [];
  const fetchImpl = (async (url: string) => { urls.push(url); return Response.json({ items: [], pagination: { total_count: 0, max_page: 1 } }); }) as unknown as typeof fetch;
  await new PolarClient({ token: "t", mode: "test", requestsPerMinute: 1e7, fetchImpl }).count("/orders/");
  await new PolarClient({ token: "t", mode: "live", requestsPerMinute: 1e7, fetchImpl }).count("/orders/");
  assert.match(urls[0], /^https:\/\/sandbox-api\.polar\.sh\/v1\/orders\//);
  assert.match(urls[1], /^https:\/\/api\.polar\.sh\/v1\/orders\//);
});
