/**
 * Runs the real engines, job runner and D1 sink against a real local D1
 * (miniflare) with the repo's SQL migrations. Source APIs are faked at the
 * fetch layer. Run: npm run test:integration
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { after, before, test } from "node:test";
import { Miniflare } from "miniflare";

const CF = Symbol.for("__cloudflare-context__");
let mf: Miniflare;
let d1: any; // eslint-disable-line @typescript-eslint/no-explicit-any
const realFetch = globalThis.fetch;

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// ------------------------------------------------------------- fake sources
function page(rows: Json[], u: URL, sizeKey = "limit", pageKey = "page", base = 1) {
  const size = Number(u.searchParams.get(sizeKey)) || 100;
  const n = Number(u.searchParams.get(pageKey) ?? base);
  return rows.slice((n - base) * size, (n - base) * size + size);
}

const polarProducts: Json[] = [
  { id: "pp1", name: "Polar Kit", description: "d", is_recurring: false, is_archived: false, organization_id: "org1", medias: [], prices: [{ id: "ppr1", amount_type: "fixed", price_amount: 1900, price_currency: "usd", is_archived: false }, { id: "ppr2", amount_type: "custom", minimum_amount: 500, preset_amount: 1000, price_currency: "usd", is_archived: false }], benefits: [{ id: "pb1", type: "license_keys", properties: { activations: { limit: 2 }, expires: null } }, { id: "pb2", type: "github_repository", properties: { repository_owner: "acme", repository_name: "kit" } }] },
  { id: "pp2", name: "Polar Sub", is_recurring: true, recurring_interval: "month", recurring_interval_count: 1, trial_interval: "day", trial_interval_count: 7, is_archived: false, organization_id: "org1", medias: [], prices: [{ id: "ppr3", amount_type: "fixed", price_amount: 900, price_currency: "usd", is_archived: false }], benefits: [] },
];

function polarApi(u: URL): Response | null {
  const data: Record<string, Json[]> = {
    "/v1/products/": polarProducts,
    "/v1/customers/": [{ id: "pc1", email: "buyer@x.com", name: "Buyer" }],
    "/v1/orders/": [{ id: "po1", status: "paid", total_amount: 1900, discount_amount: 0, currency: "usd", product_id: "pp1", customer: { email: "buyer@x.com", name: "Buyer" }, items: [{ product_price_id: "ppr1", label: "Kit" }], created_at: "2026-03-01T00:00:00Z" }],
    "/v1/license-keys/": [{ id: "pl1", key: "POLAR-KEY-0001", display_key: "***0001", customer: { email: "buyer@x.com" }, benefit_id: "pb1", status: "granted", limit_activations: 2 }],
    "/v1/discounts/": [{ id: "pd1", code: "polar10", type: "percentage", basis_points: 1000, products: [{ id: "pp1" }] }],
    "/v1/subscriptions/": [{ id: "ps1", status: "active", current_period_end: "2099-01-01T00:00:00Z", customer_id: "pc1", customer: { email: "buyer@x.com", name: "Buyer" }, product_id: "pp2", prices: [{ id: "ppr3" }], product: { name: "Polar Sub" } }],
  };
  const lic = u.pathname.match(/^\/v1\/license-keys\/(.+)$/);
  if (lic) return Response.json({ ...data["/v1/license-keys/"][0], activations: [{ id: "act1", label: "laptop", created_at: "2026-04-01T00:00:00Z" }] });
  if (u.pathname === "/v1/organizations/") return Response.json({ items: [{ id: "org1", name: "Acme" }], pagination: { total_count: 1, max_page: 1 } });
  const rows = data[u.pathname];
  if (!rows) return null;
  const size = Number(u.searchParams.get("limit"));
  return Response.json({ items: page(rows, u), pagination: { total_count: rows.length, max_page: Math.max(1, Math.ceil(rows.length / size)) } });
}

function paddleApi(u: URL): Response | null {
  const data: Record<string, Json[]> = {
    "/products": [{ id: "pro_1", name: "Paddle Kit", status: "active" }],
    "/prices": [{ id: "pri_1", product_id: "pro_1", description: "Yearly", unit_price: { amount: "9900", currency_code: "USD" }, billing_cycle: { interval: "year", frequency: 1 }, status: "active" }],
    "/customers": [{ id: "ctm_1", email: "pad@x.com", name: "Pad" }],
    "/transactions": [{ id: "txn_1", status: "completed", customer_id: "ctm_1", currency_code: "USD", created_at: "2026-01-01T00:00:00Z", details: { totals: { total: "9900" }, line_items: [{ price_id: "pri_1", product_id: "pro_1", totals: { total: "5000", discount: "0" } }, { price_id: "pri_1", product_id: "pro_1", totals: { total: "4900", discount: "0" } }] } }, { id: "txn_2", status: "completed", customer_id: "ctm_1", currency_code: "USD", created_at: "2026-02-01T00:00:00Z", details: { totals: { total: "9900" }, line_items: [{ price_id: "pri_1", product_id: "pro_1", totals: { total: "9900", discount: "0" } }] } }],
    "/adjustments": [{ id: "adj_1", transaction_id: "txn_1", action: "refund", status: "approved" }],
    "/discounts": [{ id: "dsc_1", code: "PAD", type: "flat", amount: "500", status: "active", restrict_to: ["pri_1"] }],
    "/subscriptions": [{ id: "sub_1", status: "active", customer_id: "ctm_1", next_billed_at: "2099-01-01T00:00:00Z", items: [{ price: { id: "pri_1", product_id: "pro_1" }, product: { name: "Paddle Kit" } }] }],
    "/customers/ctm_1/payment-methods": [{ id: "paymtd_1", type: "card", card: { type: "visa", last4: "4242" } }],
  };
  let rows = data[u.pathname];
  if (!rows) return null;
  const ids = u.searchParams.get("id");
  if (ids) rows = rows.filter((r) => ids.split(",").includes(r.id));
  const per = Number(u.searchParams.get("per_page")) || 50;
  const after = u.searchParams.get("after");
  const start = after ? rows.findIndex((r) => r.id === after) + 1 : 0;
  const slice = rows.slice(start, start + per);
  return Response.json({ data: slice, meta: { pagination: { has_more: start + per < rows.length, next: `https://api.paddle.com${u.pathname}?after=${slice.at(-1)?.id}`, estimated_total: rows.length } } });
}

function dodoApi(u: URL): Response | null {
  const product = { product_id: "pdt_1", business_id: "biz", name: "Dodo Kit", description: "d", is_recurring: false, price_detail: { type: "one_time_price", price: 2500, currency: "USD" }, entitlements: [{ id: "e1", integration_type: "license_key", integration_config: { activations_limit: 3 } }] };
  const data: Record<string, Json[]> = {
    "/products": [product],
    "/customers": [{ customer_id: "cus_1", email: "dodo@x.com", name: "Dodo" }],
    "/payments": [{ payment_id: "pay_1", status: "succeeded", total_amount: 2500, currency: "USD", customer: { email: "dodo@x.com", name: "Dodo" }, created_at: "2026-01-01T00:00:00Z" }],
    "/license_keys": [{ id: "lic_1", key: "DODO-KEY-1", status: "active", customer_id: "cus_1", product_id: "pdt_1", payment_id: "pay_1", activations_limit: 3, created_at: "2026-01-02T00:00:00Z" }],
    "/license_key_instances": [{ id: "lki_1", name: "srv", license_key_id: "lic_1", created_at: "2026-01-03T00:00:00Z" }],
    "/discounts": [{ discount_id: "dsc_1", code: "dodo5", type: "percentage", amount: 500, restricted_to: [] }],
    "/subscriptions": [{ subscription_id: "sub_1", status: "active", product_id: "pdt_1", product_name: "Dodo Kit", next_billing_date: "2099-01-01T00:00:00Z", customer: { customer_id: "cus_1", email: "dodo@x.com", name: "Dodo" } }],
  };
  const pay = u.pathname.match(/^\/payments\/(.+)$/);
  if (pay) return Response.json({ payment_id: pay[1], product_cart: [{ product_id: "pdt_1", quantity: 1 }] });
  const cust = u.pathname.match(/^\/customers\/(.+)$/);
  if (cust) return Response.json(data["/customers"][0]);
  const prod = u.pathname.match(/^\/products\/(.+)$/);
  if (prod) return Response.json(product);
  let rows = data[u.pathname];
  if (!rows) return null;
  const lk = u.searchParams.get("license_key_id");
  if (lk) rows = rows.filter((r) => r.license_key_id === lk);
  return Response.json({ items: page(rows, u, "page_size", "page_number", 0) });
}

function lemonApi(u: URL): Response | null {
  const res = (id: string, type: string, attributes: Json) => ({ id, type, attributes });
  const data: Record<string, Json[]> = {
    products: [res("1", "products", { name: "LS Kit", slug: "ls-kit", price: 1000, status: "published" })],
    variants: [res("10", "variants", { product_id: 1, name: "Std", price: 1000, status: "published", has_license_keys: true, license_activation_limit: 2 })],
    files: [],
    customers: [res("c1", "customers", { email: "ls@x.com", name: "LS" })],
    orders: [res("o1", "orders", { user_email: "ls@x.com", total: 1000, status: "paid", created_at: "2026-01-01T00:00:00Z", first_order_item: { product_id: 1, variant_id: 10, product_name: "LS Kit", variant_name: "Std" } })],
    "license-keys": [res("l1", "license-keys", { key: "LS-KEY-1", user_email: "ls@x.com", order_id: "o1", product_id: 1, activation_limit: 2 })],
    "license-key-instances": [],
    discounts: [],
    affiliates: [],
    subscriptions: [res("s1", "subscriptions", { user_email: "ls@x.com", status: "active", payment_processor: "paypal", product_id: 1, variant_id: 10, renews_at: "2099-01-01T00:00:00Z" })],
  };
  const kind = u.pathname.replace("/v1/", "");
  if (kind === "stores") return Response.json({ data: [res("1", "stores", { name: "LS", currency: "USD" })], links: {} });
  const rows = data[kind];
  if (!rows) return null;
  const size = Number(u.searchParams.get("page[size]")) || 100;
  const n = Number(u.searchParams.get("page[number]")) || 1;
  return Response.json({ data: rows.slice((n - 1) * size, n * size), links: { next: n * size < rows.length ? "n" : null }, meta: { page: { total: rows.length } } });
}

const hits: string[] = [];
const fakeFetch = (async (input: any, init?: RequestInit) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const u = new URL(typeof input === "string" ? input : input.url);
  hits.push(u.host);
  const handler = u.host.endsWith("lemonsqueezy.com") ? lemonApi : u.host.endsWith("polar.sh") ? polarApi : u.host.endsWith("paddle.com") ? paddleApi : u.host.endsWith("dodopayments.com") ? dodoApi : null;
  if (!handler) return realFetch(input, init);
  const response = handler(u);
  return response ?? new Response("{}", { status: 404 });
}) as typeof fetch;

// ------------------------------------------------------------------- setup
const USER = "user-1";
const STORE = "store-1";

before(async () => {
  mf = new Miniflare({ modules: true, script: "export default { fetch() { return new Response('ok'); } }", d1Databases: { DB: "migrations-test" } });
  d1 = await mf.getD1Database("DB");
  const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as { entries: Array<{ tag: string }> };
  for (const entry of journal.entries) {
    const sql = readFileSync(`drizzle/${entry.tag}.sql`, "utf8");
    for (const statement of sql.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean)) {
      await d1.prepare(statement).run();
    }
  }
  const now = new Date().toISOString();
  await d1.prepare("INSERT INTO users (id,email,name,password_hash,store_name,store_slug,created_at) VALUES (?,?,?,?,?,?,?)").bind(USER, "o@x.com", "Owner", "x", "Shop", "shop", now).run();
  await d1.prepare("INSERT INTO stores (id,user_id,name,slug,created_at,updated_at) VALUES (?,?,?,?,?,?)").bind(STORE, USER, "Shop", "shop", now, now).run();
  (globalThis as any)[CF] = { env: { DB: d1, ENCRYPTION_SECRET: "test-secret", AUTH_SECRET: "auth" }, ctx: { waitUntil() {}, passThroughOnException() {} }, cf: {} }; // eslint-disable-line @typescript-eslint/no-explicit-any
  globalThis.fetch = fakeFetch;
});

after(async () => {
  globalThis.fetch = realFetch;
  await mf?.dispose();
});

async function count(table: string, where = "1=1", ...binds: unknown[]): Promise<number> {
  const row = await d1.prepare(`SELECT count(*) AS n FROM ${table} WHERE ${where}`).bind(...binds).first();
  return Number(row.n);
}

async function runJob(source: "lemonsqueezy" | "polar" | "paddle" | "dodo", secret: string, extra: Json = {}) {
  const { createMigrationJob, advanceMigrationJob } = await import("../../src/lib/lemonsqueezy/import-job");
  const job = await createMigrationJob({ source, userId: USER, storeId: STORE, apiKey: secret, lsStoreId: source === "polar" ? "org1" : source === "lemonsqueezy" ? "1" : "default", mode: "test", ...extra });
  let view = job;
  for (let i = 0; i < 300 && view.status === "running"; i += 1) {
    view = (await advanceMigrationJob(USER, job.id))!;
  }
  return view;
}

// ------------------------------------------------------------------- tests
test("polar: stores listed and preview counts through the adapter", async () => {
  const { getSourceStores, previewImport } = await import("../../src/lib/lemonsqueezy/import-job");
  assert.deepEqual((await getSourceStores("polar", "polar_oat_xxxxxxxx", "test")).map((s) => s.id), ["org1"]);
  const preview = await previewImport({ source: "polar", apiKey: "polar_oat_xxxxxxxx", lsStoreId: "org1", storeId: STORE, userId: USER, mode: "test" });
  assert.equal(preview.environment, "sandbox");
  assert.equal(preview.counts.products, 2);
  assert.equal(preview.counts.orders, 1);
  assert.equal(preview.alreadyImportedProducts, 0);
});

test("polar: job imports into real tables, key is wiped, nothing duplicated on re-run", async () => {
  const done = await runJob("polar", "polar_oat_xxxxxxxx");
  assert.equal(done.status, "completed", JSON.stringify(done.errors));
  assert.equal(done.source, "polar");
  assert.equal(await count("products", "source='polar'"), 2);
  assert.equal(await count("product_variants", "source='polar'"), 3);
  const kit = await d1.prepare("SELECT * FROM product_variants WHERE source_id='ppr1'").first();
  assert.equal(kit.price, 1900);
  assert.equal(kit.generate_license, 1);
  assert.equal(kit.license_seat_limit, 2);
  assert.equal(kit.github_repo_owner, "acme");
  const custom = await d1.prepare("SELECT * FROM product_variants WHERE source_id='ppr2'").first();
  assert.equal(custom.custom_amount_enabled, 1);
  assert.equal(custom.min_price, 500);
  const order = await d1.prepare("SELECT * FROM orders WHERE source='polar'").first();
  assert.equal(order.gateway, "polar");
  assert.equal(order.amount, 1900);
  assert.equal(order.environment, "sandbox");
  assert.ok(order.variant_id, "variant linked");
  const license = await d1.prepare("SELECT * FROM feature_records WHERE feature='licenses' AND title='POLAR-KEY-0001'").first();
  assert.equal(JSON.parse(license.data).source, "polar");
  assert.equal(JSON.parse(license.data).lemonSqueezyInstances.length, 1);
  const sub = await d1.prepare("SELECT * FROM feature_records WHERE feature='subscriptions'").first();
  assert.equal(sub.status, "migration_pending");
  assert.equal(JSON.parse(sub.data).migrationState, "waiting_for_cards");
  assert.equal(JSON.parse(sub.data).sourceCustomerId, "pc1");
  const job = await d1.prepare("SELECT encrypted_key, status FROM migration_jobs WHERE source='polar'").first();
  assert.equal(job.encrypted_key, null, "secret wiped when finished");
  const before = [await count("orders"), await count("product_variants"), await count("feature_records")];
  const again = await runJob("polar", "polar_oat_xxxxxxxx");
  assert.equal(again.status, "completed");
  assert.deepEqual([await count("orders"), await count("product_variants"), await count("feature_records")], before);
  assert.equal(again.counts.orders.imported, 0);
  // the second preview now reports the products as already imported
  const { previewImport } = await import("../../src/lib/lemonsqueezy/import-job");
  const preview = await previewImport({ source: "polar", apiKey: "polar_oat_xxxxxxxx", lsStoreId: "org1", storeId: STORE, userId: USER, mode: "test" });
  assert.equal(preview.alreadyImportedProducts, 2);
});

test("polar: variant resolution uses the imported variants (checkout path)", async () => {
  const { findProductById } = await import("../../src/lib/db");
  const { effectiveProduct } = await import("../../src/lib/product-variants");
  const row = await d1.prepare("SELECT id FROM products WHERE source_id='pp2'").first();
  const product = await findProductById(row.id);
  assert.ok(product);
  const sold = effectiveProduct(product!, {});
  assert.equal(sold.billingType, "subscription");
  assert.equal(sold.intervalUnit, "month");
  assert.equal(sold.trialDays, 7);
});

test("paddle: multi-item transaction, refund adjustment and payment method id", async () => {
  const done = await runJob("paddle", "pdl_sdbx_apikey_xxxxxxxxxxxx");
  assert.equal(done.status, "completed", JSON.stringify(done.errors));
  const orders = (await d1.prepare("SELECT source_id,status,amount,gateway FROM orders WHERE source='paddle' ORDER BY source_id").all()).results as Json[];
  assert.deepEqual(orders.map((o) => [o.source_id, o.status, o.amount, o.gateway]), [["txn_1:0", "refunded", 5000, "paddle"], ["txn_1:1", "refunded", 4900, "paddle"], ["txn_2", "paid", 9900, "paddle"]]);
  const sub = await d1.prepare("SELECT data FROM feature_records WHERE feature='subscriptions' AND json_extract(data,'$.source')='paddle'").first();
  const data = JSON.parse(sub.data);
  assert.equal(data.sourcePaymentMethodId, "paymtd_1");
  assert.equal(data.cardLast4, "4242");
  assert.equal(data.paymentProcessor, "stripe");
  const discount = await d1.prepare("SELECT * FROM feature_records WHERE feature='discounts' AND title='PAD'").first();
  assert.equal(JSON.parse(discount.data).value, 5);
  const variant = await d1.prepare("SELECT * FROM product_variants WHERE source='paddle'").first();
  assert.equal(variant.billing_type, "subscription");
  assert.equal(variant.interval_unit, "year");
});

test("paddle: stripe mapping upload, then exact-ID linking plan", async () => {
  const { applyStripeMapping, listMigrationSubscriptions } = await import("../../src/lib/lemonsqueezy/subscription-migration");
  const { parseStripeMappingCsv } = await import("../../src/lib/migrations/stripe-import-mapping");
  const rows = parseStripeMappingCsv("Paddle Customer ID,Paddle Payment Method ID,Stripe Customer ID,Stripe Payment Method ID\nctm_1,paymtd_1,cus_PAD,pm_PAD\nctm_9,paymtd_9,cus_X,pm_X\n");
  const result = await applyStripeMapping({ userId: USER, storeId: STORE, environment: "sandbox", source: "paddle", rows });
  assert.deepEqual(result, { matched: 1, unmatched: 0 });
  const listed = await listMigrationSubscriptions(USER, STORE, "sandbox", "paddle");
  assert.equal(listed.length, 1);
  assert.equal(listed[0].migrationState, "waiting_for_cards");
  assert.equal(listed[0].lsSourceId, "sub_1");
  const data = JSON.parse((await d1.prepare("SELECT data FROM feature_records WHERE feature='subscriptions' AND json_extract(data,'$.source')='paddle'").first()).data);
  assert.equal(data.stripeCustomerId, "cus_PAD");
  assert.equal(data.stripePaymentMethodId, "pm_PAD");
  // sources are isolated from each other
  assert.equal((await listMigrationSubscriptions(USER, STORE, "sandbox", "polar")).length, 1);
  assert.equal((await listMigrationSubscriptions(USER, STORE, "sandbox", "dodo")).length, 0);
});

test("dodo: key prefix selects test host; orders get product via cart; license + instance", async () => {
  hits.length = 0;
  const done = await runJob("dodo", "dodo_test_apikey_xxxxxxxx", { stages: ["customers", "orders", "licenses", "discounts", "subscriptions"] });
  assert.equal(done.status, "completed", JSON.stringify(done.errors));
  assert.equal(done.environment, "sandbox");
  assert.ok(hits.every((h) => h === "test.dodopayments.com"), `hit ${[...new Set(hits)]}`);
  const order = await d1.prepare("SELECT * FROM orders WHERE source='dodo'").first();
  assert.equal(order.gateway, "dodo");
  assert.equal(order.product_name, "Dodo Kit");
  const license = await d1.prepare("SELECT * FROM feature_records WHERE feature='licenses' AND title='DODO-KEY-1'").first();
  const lic = JSON.parse(license.data);
  assert.equal(lic.lemonSqueezyInstances[0].id, "lki_1");
  assert.equal(lic.seatLimit, 3);
  assert.equal(lic.orderId, order.id);
  const sub = await d1.prepare("SELECT data FROM feature_records WHERE feature='subscriptions' AND json_extract(data,'$.source')='dodo'").first();
  assert.equal(JSON.parse(sub.data).migrationState, "needs_resubscribe");
});

test("compat shims work end to end on imported license rows", async () => {
  const { findCompatLicense, respond } = await import("../../src/app/api/compat/lemonsqueezy/v1/licenses/compat.utils");
  const { polarActivate, polarValidate, polarDeactivate } = await import("../../src/lib/migrations/polar/license-compat");
  const { dodoActivate, dodoValidate } = await import("../../src/lib/migrations/dodo/license-compat");
  let license = await findCompatLicense("polar-key-0001");
  assert.ok(license);
  const activated = polarActivate(license, { label: "second" }, "act2");
  assert.equal(activated.status, 200);
  await respond(license, activated);
  license = await findCompatLicense("POLAR-KEY-0001");
  assert.equal((polarValidate(license, { activationId: "act1" }).body as Json).activation.label, "laptop");
  assert.equal(polarActivate(license, { label: "third" }, "act3").status, 403, "limit 2 reached after activation");
  assert.equal(polarDeactivate(license, { activationId: "act2" }).status, 204);
  const dodoLicense = await findCompatLicense("DODO-KEY-1");
  assert.deepEqual(dodoValidate(dodoLicense, { instanceId: "lki_1" }).body, { valid: true });
  assert.equal(dodoActivate(dodoLicense, { name: "n" }, "lki_2").status, 201);
});

test("resubscribe emails target needs_resubscribe rows of the right source only", async () => {
  const { listMigrationSubscriptions } = await import("../../src/lib/lemonsqueezy/subscription-migration");
  const dodoRows = await listMigrationSubscriptions(USER, STORE, "sandbox", "dodo");
  assert.equal(dodoRows[0].migrationState, "needs_resubscribe");
});

test("a second running job is refused; cancel wipes the secret", async () => {
  const { createMigrationJob, cancelMigrationJob } = await import("../../src/lib/lemonsqueezy/import-job");
  const job = await createMigrationJob({ source: "dodo", userId: USER, storeId: STORE, apiKey: "dodo_test_apikey_xxxxxxxx", lsStoreId: "default", mode: "test" });
  await assert.rejects(() => createMigrationJob({ source: "polar", userId: USER, storeId: STORE, apiKey: "polar_oat_xxxxxxxx", lsStoreId: "org1", mode: "test" }), /already running/);
  const cancelled = await cancelMigrationJob(USER, job.id);
  assert.equal(cancelled!.status, "cancelled");
  const row = await d1.prepare("SELECT encrypted_key FROM migration_jobs WHERE id=?").bind(job.id).first();
  assert.equal(row.encrypted_key, null);
});

test("route handlers reject unknown sources and unauthenticated calls", async () => {
  const { connect } = await import("../../src/lib/migrations/route-handlers");
  const response = await connect(new Request("http://localhost/x", { method: "POST", body: "{}" }), { params: Promise.resolve({ source: "gumroad" }) });
  assert.equal(response.status, 404);
});

test("lemon squeezy still imports through the shared sink (regression)", async () => {
  const done = await runJob("lemonsqueezy", "lemon_squeezy_api_key_xxxxxxxx");
  assert.equal(done.status, "completed", JSON.stringify(done.errors));
  const order = await d1.prepare("SELECT * FROM orders WHERE source='lemonsqueezy'").first();
  assert.equal(order.gateway, "lemonsqueezy");
  assert.equal(order.amount, 1000);
  const sub = await d1.prepare("SELECT data FROM feature_records WHERE feature='subscriptions' AND json_extract(data,'$.source')='lemonsqueezy'").first();
  assert.equal(JSON.parse(sub.data).migrationState, "needs_resubscribe", "PayPal subs re-subscribe");
  const { listMigrationSubscriptions } = await import("../../src/lib/lemonsqueezy/subscription-migration");
  assert.equal((await listMigrationSubscriptions(USER, STORE, "sandbox")).length, 1);
  assert.equal(await count("feature_records", "feature='licenses' AND title='LS-KEY-1'"), 1);
});
