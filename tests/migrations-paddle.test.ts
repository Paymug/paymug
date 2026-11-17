import assert from "node:assert/strict";
import { test } from "node:test";
import { createInitialState } from "../src/lib/lemonsqueezy/import-engine";
import { PaddleClient, cursorFromNext } from "../src/lib/migrations/paddle/client";
import { paddleStages, runPaddleChunk } from "../src/lib/migrations/paddle/engine";
import { mapPaddleDiscount, mapPaddlePrice, mapPaddleSubscription, mapPaddleTransaction, minor } from "../src/lib/migrations/paddle/mappers";
import { memorySink, runAll } from "./helpers/memory-sink";

type R = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

test("money strings become cents; junk becomes 0", () => {
  assert.equal(minor("1999"), 1999);
  assert.equal(minor("19.6"), 20);
  assert.equal(minor(null), 0);
  assert.equal(minor("abc"), 0);
  assert.equal(minor("-5"), 0);
});

test("cursor comes from next url", () => {
  assert.equal(cursorFromNext("https://api.paddle.com/products?after=pro_9&per_page=2"), "pro_9");
  assert.equal(cursorFromNext(undefined), undefined);
  assert.equal(cursorFromNext("not a url"), undefined);
});

test("price: billing cycle, trial and overrides", () => {
  const m = mapPaddlePrice(
    { id: "pri_1", product_id: "pro_1", description: "Monthly", unit_price: { amount: "900", currency_code: "EUR" }, billing_cycle: { interval: "month", frequency: 3 }, trial_period: { interval: "week", frequency: 2 }, unit_price_overrides: [{}, {}], status: "active" },
    new Set(), 0,
  );
  assert.equal(m.variant.price, 900);
  assert.equal(m.variant.billingType, "subscription");
  assert.equal(m.variant.intervalUnit, "month");
  assert.equal(m.variant.intervalCount, 3);
  assert.equal(m.variant.trialDays, 14);
  assert.equal(m.currency, "EUR");
  assert.equal(m.overrideCount, 2);
  const once = mapPaddlePrice({ id: "pri_2", product_id: "pro_1", description: "Once", unit_price: { amount: "100", currency_code: "USD" }, billing_cycle: null, status: "archived" }, new Set(), 1);
  assert.equal(once.variant.billingType, "one_time");
  assert.equal(once.variant.status, "draft");
});

test("transaction: one order per line item with its own totals", () => {
  const txn = { id: "txn_1", status: "completed", currency_code: "USD", created_at: "2026-01-01T00:00:00Z", billed_at: "2026-01-02T00:00:00Z", details: { totals: { total: "3000" }, line_items: [
    { price_id: "pri_1", product_id: "pro_1", totals: { total: "1000", discount: "100" }, product: { name: "A" } },
    { price_id: "pri_2", product_id: "pro_2", totals: { total: "2000", discount: "0" }, product: { name: "B" } },
  ] } };
  const orders = mapPaddleTransaction(txn, { email: "A@X.com", name: "A" });
  assert.deepEqual(orders.map((o) => [o.sourceId, o.amount, o.discountAmount, o.productSourceId]), [["txn_1:0", 1000, 100, "pro_1"], ["txn_1:1", 2000, 0, "pro_2"]]);
  assert.equal(orders[0].paidAt, "2026-01-02T00:00:00Z");
  assert.equal(orders[0].email, "a@x.com");
  const single = mapPaddleTransaction({ ...txn, details: { totals: { total: "1000" }, line_items: [txn.details.line_items[0]] } }, { email: "a@x.com" });
  assert.equal(single[0].sourceId, "txn_1");
  assert.deepEqual(mapPaddleTransaction({ ...txn, status: "canceled" }, { email: "a@x.com" }), []);
  assert.deepEqual(mapPaddleTransaction(txn, undefined), []);
});

test("discount: percentage vs flat, scope by price, status", () => {
  const p = mapPaddleDiscount({ id: "dsc_1", code: "save", type: "percentage", amount: "15", status: "active", usage_limit: 5, times_used: 1, restrict_to: ["pri_1"] }, ["pri_1"])!;
  assert.equal(p.value, 15);
  assert.equal(p.type, "percentage");
  assert.equal(p.limitedToProducts, true);
  const f = mapPaddleDiscount({ id: "dsc_2", code: "flat", type: "flat", amount: "500", status: "archived" }, [])!;
  assert.equal(f.value, 5);
  assert.equal(f.active, false);
  assert.equal(mapPaddleDiscount({ id: "dsc_3", code: null, type: "flat", amount: "1" }, []), null);
});

test("subscription: card details, scheduled cancel, manual collection", () => {
  const sub = { id: "sub_1", status: "active", customer_id: "ctm_1", next_billed_at: "2027-01-01T00:00:00Z", collection_mode: "automatic", items: [{ price: { id: "pri_1", product_id: "pro_1" }, product: { name: "A" } }] };
  const m = mapPaddleSubscription(sub, { email: "a@x.com", name: "A" }, { id: "paymtd_1", type: "card", card: { type: "visa", last4: "4242" } })!;
  assert.equal(m.billing, true);
  assert.equal(m.cardLast4, "4242");
  assert.equal(m.sourcePaymentMethodId, "paymtd_1");
  assert.equal(m.sourceCustomerId, "ctm_1");
  assert.equal(m.renewsAt, "2027-01-01T00:00:00Z");
  assert.equal(m.migrationState, "waiting_for_cards");
  assert.equal(mapPaddleSubscription({ ...sub, scheduled_change: { action: "cancel", effective_at: "2026-12-01T00:00:00Z" } }, { email: "a@x.com" }, null)!.billing, false);
  const manual = mapPaddleSubscription({ ...sub, collection_mode: "manual" }, { email: "a@x.com" }, null)!;
  assert.equal(manual.migrationState, "needs_resubscribe");
  assert.equal(mapPaddleSubscription(sub, undefined, null), null);
});

// ---------------------------------------------------------------- engine
function fakePaddle(opts: { perPage?: number; rateLimitOnce?: boolean } = {}) {
  const data: Record<string, R[]> = {
    "/products": [{ id: "pro_1", name: "Kit", description: "d", status: "active" }, { id: "pro_2", name: "Old", status: "archived" }],
    "/prices": [
      { id: "pri_1", product_id: "pro_1", description: "Monthly", unit_price: { amount: "900", currency_code: "USD" }, billing_cycle: { interval: "month", frequency: 1 }, status: "active", unit_price_overrides: [{}] },
      { id: "pri_2", product_id: "pro_1", description: "Once", unit_price: { amount: "5000", currency_code: "USD" }, billing_cycle: null, status: "active" },
      { id: "pri_3", product_id: "pro_2", description: "Legacy", unit_price: { amount: "100", currency_code: "USD" }, status: "archived" },
    ],
    "/customers": [{ id: "ctm_1", email: "a@x.com", name: "A" }, { id: "ctm_2", email: "b@x.com", name: "B" }],
    "/transactions": Array.from({ length: 35 }, (_, i) => ({
      id: `txn_${i}`, status: "completed", customer_id: i === 34 ? "ctm_missing" : "ctm_1", currency_code: "USD", created_at: "2026-01-01T00:00:00Z",
      details: { totals: { total: "900" }, line_items: [{ price_id: "pri_1", product_id: "pro_1", totals: { total: "900", discount: "0" }, product: { name: "Kit" } }] },
    })),
    "/adjustments": [{ id: "adj_1", transaction_id: "txn_3", action: "refund", status: "approved", type: "full" }, { id: "adj_2", transaction_id: "txn_nope", action: "refund", status: "approved" }],
    "/discounts": [{ id: "dsc_1", code: "SAVE", type: "percentage", amount: "10", status: "active", restrict_to: ["pri_1"], recur: true, maximum_recurring_intervals: 3 }, { id: "dsc_2", code: "NOPE", type: "flat", amount: "100", status: "active", restrict_to: ["pri_unknown"] }, { id: "dsc_3", code: null, type: "flat", amount: "1" }],
    "/subscriptions": [{ id: "sub_1", status: "active", customer_id: "ctm_1", next_billed_at: "2027-01-01T00:00:00Z", items: [{ price: { id: "pri_1", product_id: "pro_1" }, product: { name: "Kit" } }] }],
    "/customers/ctm_1/payment-methods": [{ id: "paymtd_1", type: "card", card: { type: "visa", last4: "4242" } }],
  };
  const requests: string[] = [];
  const sleeps: number[] = [];
  let limited = false;
  const fetchImpl = (async (url: string) => {
    const u = new URL(url);
    requests.push(`${u.pathname}${u.search}`);
    if (opts.rateLimitOnce && !limited) { limited = true; return new Response("", { status: 429 }); }
    let rows = data[u.pathname] ?? [];
    for (const key of ["product_id"]) { const v = u.searchParams.get(key); if (v) rows = rows.filter((r) => r[key] === v); }
    const ids = u.searchParams.get("id");
    if (ids) rows = rows.filter((r) => ids.split(",").includes(r.id));
    const perPage = Number(u.searchParams.get("per_page")) || 50;
    if (u.pathname === "/transactions" && perPage > 30) return Response.json({ error: "per_page max 30" }, { status: 400 });
    const after = u.searchParams.get("after");
    const start = after ? rows.findIndex((r) => r.id === after) + 1 : 0;
    const slice = rows.slice(start, start + perPage);
    const hasMore = start + perPage < rows.length;
    const nextUrl = `https://api.paddle.com${u.pathname}?after=${slice.at(-1)?.id ?? ""}&per_page=${perPage}`;
    return Response.json({ data: slice, meta: { pagination: { per_page: perPage, next: nextUrl, has_more: hasMore, estimated_total: rows.length } } });
  }) as unknown as typeof fetch;
  const client = new PaddleClient({ apiKey: "pdl_sdbx_x", mode: "test", requestsPerMinute: 1e7, fetchImpl, sleep: async (ms) => { sleeps.push(ms); } });
  return { client, requests, sleeps };
}

const options = { lsStoreId: "default", stages: [...paddleStages] };

test("paddle: full import end to end", async () => {
  const { sink, t } = memorySink();
  const { client, requests } = fakePaddle();
  const state = await runAll(runPaddleChunk, createInitialState(), options, client, sink);
  assert.equal(state.stage, "done");
  assert.equal(t.products.size, 2);
  assert.equal([...t.products.values()].find((p) => p.sourceId === "pro_2")!.status, "draft");
  assert.equal(t.variants.size, 3);
  assert.equal(t.customers.size, 2);
  assert.equal(t.orders.size, 34, "35 txns over 2 pages (30 max); the one with unknown customer is skipped");
  assert.equal(state.counts.orders.skipped, 1);
  assert.equal(requests.filter((r) => r.startsWith("/transactions")).length, 2, "35 txns need 2 pages at 30 per page");
  // refunds applied
  assert.equal([...t.orders.values()].find((o) => o.sourceId === "txn_3")!.status, "refunded");
  assert.equal(state.counts.refunds.imported, 1);
  assert.equal(state.counts.refunds.skipped, 1);
  // discounts
  const discounts = [...t.discounts.values()];
  assert.equal(discounts.length, 2, "null-code discount skipped");
  assert.equal(discounts.find((d) => d.code === "NOPE")!.active, false);
  const save = discounts.find((d) => d.code === "SAVE")!;
  assert.deepEqual(save.scope, [[...t.products.values()].find((p) => p.sourceId === "pro_1")!.id]);
  assert.ok(state.errors.some((e) => /recurring limit/.test(e.message)));
  assert.ok(state.errors.some((e) => /country price overrides/.test(e.message)));
  // subscription with payment method id
  const sub = [...t.subscriptions.values()][0];
  assert.equal(sub.sourcePaymentMethodId, "paymtd_1");
  assert.equal(sub.cardLast4, "4242");
  assert.equal(sub.variantId, [...t.variants.values()].find((v) => v.sourceId === "pri_1")!.id);
  // customers fetched in batches, not one by one
  assert.ok(requests.filter((r) => r.startsWith("/customers?")).length >= 3);
});

test("paddle: honors has_more (next always present) and uses the 30 limit for transactions", async () => {
  const { client, requests } = fakePaddle();
  const all = await client.listAll("/transactions", { status: "completed,billed" });
  assert.equal(all.length, 35);
  assert.ok(requests.every((r) => r.includes("per_page=30")));
});

test("paddle: 429 waits 60s then continues", async () => {
  const { client, sleeps } = fakePaddle({ rateLimitOnce: true });
  await client.listAll("/products");
  assert.deepEqual(sleeps, [60_000]);
});

test("paddle: idempotent re-run and mid-job resume (cursor persisted)", async () => {
  const mem = memorySink();
  const { client } = fakePaddle();
  let state = createInitialState();
  for (let i = 0; i < 6; i += 1) state = (await runPaddleChunk(state, options, client, mem.sink)).state;
  const final = await runAll(runPaddleChunk, JSON.parse(JSON.stringify(state)), options, client, mem.sink);
  const sizes = Object.fromEntries(Object.entries(mem.t).map(([k, v]) => [k, v.size]));
  const second = await runAll(runPaddleChunk, createInitialState(), options, client, mem.sink);
  assert.deepEqual(Object.fromEntries(Object.entries(mem.t).map(([k, v]) => [k, v.size])), sizes);
  assert.equal(final.stage, "done");
  assert.equal(second.counts.orders.imported, 0);
  assert.equal(second.counts.refunds.imported, 0, "already refunded orders are not changed twice");
});
