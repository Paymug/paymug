import assert from "node:assert/strict";
import { test } from "node:test";
import { LemonSqueezyClient } from "../src/lib/lemonsqueezy/client";
import {
  createInitialState, runImportChunk, toFailuresCsv, toIdMapCsv,
  type ImportOptions, type ImportSink, type UpsertResult,
} from "../src/lib/lemonsqueezy/import-engine";
import { importStages } from "../src/lib/lemonsqueezy/types";

type Row = Record<string, unknown>;

/** In-memory sink; upsert keyed on source id like the real one. */
function memorySink() {
  const t: Record<string, Map<string, Row & { id: string }>> = {};
  let n = 0;
  const up = (table: string, key: string, row: Row): UpsertResult => {
    const m = (t[table] ??= new Map());
    const hit = m.get(key);
    if (hit) return { id: hit.id, created: false };
    const id = `${table}-${++n}`;
    m.set(key, { ...row, id });
    return { id, created: true };
  };
  const files = new Map<string, string[]>();
  const sink: ImportSink = {
    async upsertProduct(i) { return up("products", i.sourceId, i as unknown as Row); },
    async upsertVariant(i, productId) { return up("variants", i.sourceId, { ...i, productId }); },
    async getVariantFileNames(v) { return files.get(v) ?? []; },
    async storeFile(_b, name, type) { return { id: name, name, size: 1, type, storageKey: `k/${name}` }; },
    async appendVariantFiles(v, f) { files.set(v, [...(files.get(v) ?? []), ...f.map((x) => x.name)]); },
    async upsertCustomer(i) { return up("customers", i.email, i as unknown as Row); },
    async upsertOrder(i, refs) { return up("orders", i.sourceId, { ...i, ...refs }); },
    async upsertLicense(i, refs) { return up("licenses", i.sourceId, { ...i, ...refs }); },
    async upsertDiscount(i, scope) { return up("discounts", i.sourceId, { ...i, scope }); },
    async upsertAffiliate(i) { return up("affiliates", i.sourceId, i as unknown as Row); },
    async upsertSubscription(i, refs) { return up("subscriptions", i.sourceId, { ...i, ...refs }); },
    async existingProductSlugs() { return new Set([...(t.products?.values() ?? [])].map((p) => String(p.slug))); },
    async existingAffiliateCodes() { return new Set([...(t.affiliates?.values() ?? [])].map((p) => String(p.code))); },
  };
  return { sink, t, files };
}

const res = (id: string, type: string, attributes: Row, relationships?: Row) => ({ id, type, attributes, relationships });

function fakeApi(opts: { productsPageSize?: number } = {}) {
  const data: Record<string, ReturnType<typeof res>[]> = {
    products: [res("1", "products", { name: "Kit", slug: "kit", price: 1000, status: "published" }), res("2", "products", { name: "Kit", slug: "kit", price: 500, status: "published" })],
    variants: [
      res("10", "variants", { product_id: 1, name: "Basic", price: 1000, status: "published", has_license_keys: true, license_activation_limit: 2 }),
      res("11", "variants", { product_id: 2, name: "Other", price: 500, status: "published" }),
    ],
    files: [res("100", "files", { variant_id: 10, name: "guide", extension: "pdf", size: 3, version: "2", download_url: "https://dl/100" })],
    customers: [res("c1", "customers", { email: "A@x.com", name: "A" }), res("c2", "customers", { email: "a@x.com", name: "dup" })],
    orders: [
      res("o1", "orders", { user_email: "a@x.com", total: 1000, status: "paid", created_at: "2026-01-01T00:00:00Z", first_order_item: { product_id: 1, variant_id: 10, product_name: "Kit", variant_name: "Basic" } }),
      res("o2", "orders", { user_email: "b@x.com", total: 500, status: "paid", first_order_item: { product_id: 999, variant_id: 1 } }),
    ],
    "license-keys": [res("l1", "license-keys", { key: "KEY-AAAA-1111", user_email: "a@x.com", order_id: "o1", product_id: 1, activation_limit: 2 })],
    "license-key-instances": [res("i1", "license-key-instances", { identifier: "inst-1", name: "laptop", license_key_id: "l1" })],
    discounts: [
      res("d1", "discounts", { code: "five", amount: 500, amount_type: "fixed" }),
      res("d2", "discounts", { code: "scoped", amount: 10, amount_type: "percent", is_limited_to_products: true }),
    ],
    affiliates: [res("a1", "affiliates", { user_email: "aff@x.com", user_name: "Aff", status: "active" })],
    subscriptions: [res("s1", "subscriptions", { user_email: "a@x.com", status: "active", payment_processor: "stripe", product_id: 1, variant_id: 10, renews_at: "2027-01-01T00:00:00Z" })],
  };
  const filterKey: Record<string, string> = { variants: "product_id", files: "variant_id", "license-key-instances": "license_key_id" };
  let downloads = 0;
  const fetchImpl = (async (url: string) => {
    const u = new URL(url);
    if (u.host === "dl") { downloads++; return new Response("bytes"); }
    const kind = u.pathname.replace("/v1/", "");
    if (kind.startsWith("files/")) return Response.json({ data: data.files.find((f) => f.id === kind.split("/")[1]) });
    let rows = data[kind] ?? [];
    const fk = filterKey[kind];
    if (fk) { const want = u.searchParams.get(`filter[${fk}]`); rows = rows.filter((r) => String(r.attributes[fk]) === want || (kind === "license-key-instances" && r.attributes.license_key_id === want)); }
    const size = Number(u.searchParams.get("page[size]"));
    const page = Number(u.searchParams.get("page[number]"));
    const slice = rows.slice((page - 1) * size, page * size);
    return Response.json({ data: slice, links: { next: page * size < rows.length ? "n" : null } });
  }) as unknown as typeof fetch;
  void opts;
  const client = new LemonSqueezyClient({ apiKey: "k", fetchImpl, sleep: async () => {}, requestsPerMinute: 100000 });
  return { client, downloads: () => downloads };
}

async function runAll(options: ImportOptions, client: LemonSqueezyClient, sink: ImportSink, start = createInitialState()) {
  let state = start; let guard = 0;
  for (;;) {
    const r = await runImportChunk(state, options, client, sink);
    state = r.state;
    if (r.done) return state;
    if (++guard > 200) throw new Error("did not terminate");
  }
}

const options: ImportOptions = { lsStoreId: "1", stages: [...importStages] };

test("full import maps everything and records failures", async () => {
  const { sink, t } = memorySink();
  const { client } = fakeApi();
  const state = await runAll(options, client, sink);
  assert.equal(t.products.size, 2);
  assert.equal([...t.products.values()].map((p) => p.slug).sort().join(), "kit,kit-2");
  assert.equal(t.variants.size, 2);
  assert.equal(t.customers.size, 1, "customers deduped by email");
  assert.equal(t.orders.size, 1);
  assert.equal(state.counts.orders.failed, 1);
  assert.match(state.errors.find((e) => e.stage === "orders")!.message, /not imported/);
  const lic = [...t.licenses.values()][0];
  assert.equal(lic.key, "KEY-AAAA-1111");
  assert.equal((lic.instances as unknown[]).length, 1);
  assert.equal(lic.orderId, [...t.orders.values()][0].id);
  assert.equal(state.counts.files.imported, 1);
  assert.equal(t.subscriptions.size, 1);
  assert.equal(t.affiliates.size, 1);
  // scoped discount with unresolvable scope imported inactive
  const scoped = [...t.discounts.values()].find((d) => d.code === "SCOPED")!;
  assert.equal(scoped.active, false);
  const five = [...t.discounts.values()].find((d) => d.code === "FIVE")!;
  assert.equal(five.active, true);
  assert.equal(five.scope, "all");
  assert.match(toIdMapCsv(state), /products,1,products-1/);
  assert.match(toFailuresCsv(state.errors), /orders,o2/);
});

test("re-run changes nothing (idempotent) and downloads no file twice", async () => {
  const mem = memorySink();
  const api = fakeApi();
  await runAll(options, api.client, mem.sink);
  const sizes = Object.fromEntries(Object.entries(mem.t).map(([k, v]) => [k, v.size]));
  const second = await runAll(options, api.client, mem.sink);
  assert.deepEqual(Object.fromEntries(Object.entries(mem.t).map(([k, v]) => [k, v.size])), sizes);
  assert.equal(second.counts.products.imported, 0);
  assert.equal(second.counts.products.skipped, 2);
  assert.equal(second.counts.orders.imported, 0);
  assert.equal(api.downloads(), 1);
});

test("resumes from a saved mid-job state", async () => {
  const mem = memorySink();
  const { client } = fakeApi();
  let state = createInitialState();
  for (let i = 0; i < 3; i++) state = (await runImportChunk(state, options, client, mem.sink)).state;
  const restored = JSON.parse(JSON.stringify(state));
  const final = await runAll(options, client, mem.sink, restored);
  assert.equal(final.stage, "done");
  assert.equal(mem.t.orders.size, 1);
});

test("disabled stages are skipped", async () => {
  const { sink, t } = memorySink();
  const { client } = fakeApi();
  await runAll({ lsStoreId: "1", stages: ["products", "customers"] }, client, sink);
  assert.ok(t.products && t.customers);
  assert.equal(t.orders, undefined);
  assert.equal(t.licenses, undefined);
});

test("expired file link records a failure and continues", async () => {
  const mem = memorySink();
  const base = fakeApi();
  const failing = new LemonSqueezyClient({
    apiKey: "k", sleep: async () => {}, requestsPerMinute: 100000,
    fetchImpl: (async (url: string, init?: RequestInit) => {
      if (new URL(url).host === "dl") return new Response("", { status: 403 });
      return (base.client as unknown as { fetchImpl: typeof fetch }).fetchImpl(url, init);
    }) as unknown as typeof fetch,
  });
  const state = await runAll(options, failing, mem.sink);
  assert.equal(state.counts.files.failed, 1);
  assert.match(state.errors.find((e) => e.stage === "files")!.message, /expired/);
  assert.equal(mem.t.orders.size, 1);
});

test("large store: 2500 orders finish across chunks", async () => {
  const mem = memorySink();
  const rows = Array.from({ length: 2500 }, (_, i) => ({ id: `o${i}`, type: "orders", attributes: { user_email: `u${i}@x.com`, total: 100, status: "paid", first_order_item: { product_id: 1, variant_id: 10 } } }));
  const fetchImpl = (async (url: string) => {
    const u = new URL(url); const kind = u.pathname.replace("/v1/", "");
    const size = Number(u.searchParams.get("page[size]")); const page = Number(u.searchParams.get("page[number]"));
    const all = kind === "orders" ? rows : kind === "products" ? [{ id: "1", type: "products", attributes: { name: "K", price: 1 } }] : kind === "variants" ? [{ id: "10", type: "variants", attributes: { product_id: 1, name: "V", price: 1 } }] : [];
    return Response.json({ data: all.slice((page - 1) * size, page * size), links: { next: page * size < all.length ? "n" : null } });
  }) as unknown as typeof fetch;
  const client = new LemonSqueezyClient({ apiKey: "k", fetchImpl, sleep: async () => {}, requestsPerMinute: 1e6 });
  const state = await runAll({ lsStoreId: "1", stages: ["products", "orders"] }, client, mem.sink);
  assert.equal(mem.t.orders.size, 2500);
  assert.equal(state.counts.orders.imported, 2500);
});
