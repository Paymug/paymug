/**
 * Runs the Stripe subscription lifecycle (checkout -> renewals -> failure ->
 * cancel) against a real local D1 (miniflare) with the repo's SQL migrations.
 * Run: npm run test:integration
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { Miniflare } from "miniflare";

const CF = Symbol.for("__cloudflare-context__");
const USER = "user-1";
const STORE = "store-1";
let mf: Miniflare;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let d1: any;

before(async () => {
  mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok'); } }",
    d1Databases: { DB: "stripe-sub-test" },
  });
  d1 = await mf.getD1Database("DB");
  const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as {
    entries: Array<{ tag: string }>;
  };
  for (const entry of journal.entries) {
    const sql = readFileSync(`drizzle/${entry.tag}.sql`, "utf8");
    for (const statement of sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean)) {
      await d1.prepare(statement).run();
    }
  }
  const now = new Date().toISOString();
  await d1
    .prepare("INSERT INTO users (id,email,name,password_hash,store_name,store_slug,created_at) VALUES (?,?,?,?,?,?,?)")
    .bind(USER, "o@x.com", "Owner", "x", "Shop", "shop", now)
    .run();
  await d1
    .prepare("INSERT INTO stores (id,user_id,name,slug,created_at,updated_at) VALUES (?,?,?,?,?,?)")
    .bind(STORE, USER, "Shop", "shop", now, now)
    .run();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any)[CF] = {
    env: { DB: d1, ENCRYPTION_SECRET: "test-secret", AUTH_SECRET: "auth" },
    ctx: { waitUntil() {}, passThroughOnException() {} },
    cf: {},
  };
});

after(async () => {
  await mf?.dispose();
});

async function row(sql: string, ...binds: unknown[]) {
  return d1.prepare(sql).bind(...binds).first();
}

async function setup(id: string, trialDays: number) {
  const { createProduct, createOrder } = await import("../../src/lib/db");
  const now = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const product: any = {
    id: `prod-${id}`, userId: USER, storeId: STORE, categoryIds: [], purchaseCount: 0,
    options: [], bundles: [], environment: "sandbox", name: `Pro ${id}`, slug: `pro-${id}`,
    description: "", price: 1000, transactionFeeType: "fixed", transactionFeeValue: 0,
    currency: "USD", status: "published", hideFromStorefront: false, autoRedirect: false,
    productFiles: [], generateLicense: false, licenseType: "standard",
    licenseUpdatePeriodUnit: null, licenseUpdatePeriodCount: 1, licenseSeatLimit: 1,
    extraSeatsEnabled: false, extraSeatTiers: [], extraSeatLabel: "", billingType: "subscription",
    customAmountEnabled: false, allowNote: false, intervalUnit: "month", intervalCount: 1,
    trialDays, createdAt: now, updatedAt: now,
  };
  await createProduct(product);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order: any = {
    id: `order-${id}`, userId: USER, storeId: STORE, productId: product.id,
    productName: product.name, productPrice: 1000, amount: trialDays ? 0 : 1000,
    currency: "USD", status: "pending", customerEmail: `buyer-${id}@x.com`, custom: {},
    discountAmount: 0, transactionFeeAmount: 0, environment: "sandbox", gateway: "stripe",
    createdAt: now, githubAccessStatus: "not_required", githubAccessManaged: false,
  };
  await createOrder(order);
  const session = {
    id: `cs_${id}`, url: null, mode: "subscription" as const,
    payment_status: trialDays ? ("no_payment_required" as const) : ("paid" as const),
    payment_intent: null, amount_total: trialDays ? 0 : 1000, currency: "usd",
    client_reference_id: order.id, subscription: `sub_${id}`, customer: `cus_${id}`,
    metadata: { orderId: order.id, recurringAmountCents: "1000" },
  };
  return { order, session, subId: `sub_${id}` };
}

const invoice = (id: string, sub: string, reason: string, amount = 1000) => ({
  id, subscription: sub, billing_reason: reason, amount_paid: amount,
  currency: "usd", created: Math.floor(Date.now() / 1000),
});

const recordFor = async (subId: string) =>
  JSON.parse(
    (await row("SELECT data FROM feature_records WHERE feature='subscriptions' AND json_extract(data,'$.stripeSubscriptionId')=?", subId)).data,
  );
const statusFor = async (subId: string) =>
  (await row("SELECT status FROM feature_records WHERE feature='subscriptions' AND json_extract(data,'$.stripeSubscriptionId')=?", subId)).status;

test("checkout creates one active subscription record (idempotent)", async () => {
  const { ensureStripeSubscriptionRecord } = await import("../../src/lib/stripe-subscriptions");
  const { order, session, subId } = await setup("a", 0);
  const first = await ensureStripeSubscriptionRecord(session, order);
  const second = await ensureStripeSubscriptionRecord(session, order);
  assert.equal(first?.id, second?.id);
  assert.equal((await row("SELECT count(*) n FROM feature_records WHERE feature='subscriptions'")).n, 1);
  assert.equal(await statusFor(subId), "active");
  const data = await recordFor(subId);
  assert.equal(data.amount, 10);
  assert.equal(data.paymentsReceived, 1);
  assert.equal(data.intervalUnit, "month");
  assert.equal(data.orderId, order.id);
  assert.equal(data.stripeCustomerId, "cus_a");
});

test("non-subscription sessions create nothing", async () => {
  const { ensureStripeSubscriptionRecord } = await import("../../src/lib/stripe-subscriptions");
  const { order, session } = await setup("pay", 0);
  const before = (await row("SELECT count(*) n FROM feature_records")).n;
  assert.equal(await ensureStripeSubscriptionRecord({ ...session, mode: "payment", subscription: null }, order), undefined);
  assert.equal((await row("SELECT count(*) n FROM feature_records")).n, before);
});

test("renewal invoice creates one paid order, redelivery is a no-op", async () => {
  const { handleStripeInvoicePaid } = await import("../../src/lib/stripe-subscriptions");
  const ctx = { userId: USER, mode: "sandbox" as const };
  const orders = async () => (await row("SELECT count(*) n FROM orders WHERE gateway='stripe'")).n;
  const before = await orders();

  await handleStripeInvoicePaid(invoice("in_first", "sub_a", "subscription_create"), ctx);
  assert.equal(await orders(), before, "first invoice belongs to checkout");

  await handleStripeInvoicePaid(invoice("in_free", "sub_a", "subscription_cycle", 0), ctx);
  assert.equal(await orders(), before, "zero-amount invoice ignored");

  await handleStripeInvoicePaid(invoice("in_2", "sub_a", "subscription_cycle"), ctx);
  await handleStripeInvoicePaid(invoice("in_2", "sub_a", "subscription_cycle"), ctx);
  assert.equal(await orders(), before + 1);
  const renewal = await row("SELECT * FROM orders WHERE id='stripe_in_2'");
  assert.equal(renewal.status, "paid");
  assert.equal(renewal.amount, 1000);
  assert.equal(renewal.customer_email, "buyer-a@x.com");
  assert.equal((await recordFor("sub_a")).paymentsReceived, 2);
});

test("failed payment goes past_due; next paid renewal restores active", async () => {
  const { handleStripeInvoicePaid, handleStripeInvoicePaymentFailed } = await import("../../src/lib/stripe-subscriptions");
  const ctx = { userId: USER, mode: "sandbox" as const };
  await handleStripeInvoicePaymentFailed({ ...invoice("in_3", "sub_a", "subscription_cycle", 0), attempt_count: 1 }, ctx);
  assert.equal(await statusFor("sub_a"), "past_due");
  assert.ok((await recordFor("sub_a")).lastPaymentFailedAt);
  await handleStripeInvoicePaid(invoice("in_4", "sub_a", "subscription_cycle"), ctx);
  assert.equal(await statusFor("sub_a"), "active");
  assert.equal((await recordFor("sub_a")).paymentsReceived, 3);
});

test("failed first invoice never touches a subscription", async () => {
  const { handleStripeInvoicePaymentFailed } = await import("../../src/lib/stripe-subscriptions");
  await handleStripeInvoicePaymentFailed(invoice("in_x", "sub_a", "subscription_create", 0), { userId: USER, mode: "sandbox" });
  assert.equal(await statusFor("sub_a"), "active");
});

test("Stripe-side cancellation syncs and cannot be undone by a late update", async () => {
  const { handleStripeSubscriptionChange } = await import("../../src/lib/stripe-subscriptions");
  const ctx = { userId: USER, mode: "sandbox" as const, deleted: false };
  await handleStripeSubscriptionChange({ id: "sub_a", status: "active", cancel_at_period_end: true }, ctx);
  assert.equal(await statusFor("sub_a"), "active");
  assert.equal((await recordFor("sub_a")).cancelAtPeriodEnd, true);
  await handleStripeSubscriptionChange({ id: "sub_a", status: "canceled" }, { ...ctx, deleted: true });
  assert.equal(await statusFor("sub_a"), "cancelled");
  const data = await recordFor("sub_a");
  assert.ok(data.cancelledAt);
  assert.equal(data.cancelledBy, "provider");
  await handleStripeSubscriptionChange({ id: "sub_a", status: "active" }, ctx);
  assert.equal(await statusFor("sub_a"), "cancelled", "terminal status is not resurrected");
});

test("trial checkout is trialing with no payment; first cycle invoice activates", async () => {
  const { ensureStripeSubscriptionRecord, handleStripeInvoicePaid } = await import("../../src/lib/stripe-subscriptions");
  const { order, session, subId } = await setup("t", 7);
  await ensureStripeSubscriptionRecord(session, order);
  assert.equal(await statusFor(subId), "trialing");
  const data = await recordFor(subId);
  assert.equal(data.paymentsReceived, 0);
  assert.ok(data.trialEndsAt);
  await handleStripeInvoicePaid(invoice("in_t1", subId, "subscription_cycle"), { userId: USER, mode: "sandbox" });
  assert.equal(await statusFor(subId), "active");
  assert.equal((await row("SELECT status FROM orders WHERE id='stripe_in_t1'")).status, "paid");
});

test("unknown subscription ids and other users' events are ignored", async () => {
  const { handleStripeInvoicePaid, handleStripeSubscriptionChange } = await import("../../src/lib/stripe-subscriptions");
  await handleStripeInvoicePaid(invoice("in_u", "sub_nope", "subscription_cycle"), { userId: USER, mode: "sandbox" });
  await handleStripeSubscriptionChange({ id: "sub_t", status: "canceled" }, { userId: "other", mode: "sandbox", deleted: true });
  assert.equal(await statusFor("sub_t"), "active");
  assert.equal((await row("SELECT count(*) n FROM orders WHERE id='stripe_in_u'")).n, 0);
});
