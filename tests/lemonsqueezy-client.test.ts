import assert from "node:assert/strict";
import { test } from "node:test";
import { LemonSqueezyApiError, LemonSqueezyClient, TokenBucket } from "../src/lib/lemonsqueezy/client";

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init });

function client(responses: Array<Response | Error>, calls: string[] = []) {
  const sleeps: number[] = [];
  const c = new LemonSqueezyClient({
    apiKey: "k",
    maxRetries: 3,
    sleep: async (ms) => { sleeps.push(ms); },
    fetchImpl: (async (url: string, init?: RequestInit) => {
      calls.push(`${url}|${(init?.headers as Record<string, string>)?.Authorization}`);
      const next = responses.shift();
      if (!next) throw new Error("no more responses");
      if (next instanceof Error) throw next;
      return next;
    }) as unknown as typeof fetch,
  });
  return { c, sleeps, calls };
}

test("listAll follows pagination and sends bearer key + filters", async () => {
  const calls: string[] = [];
  const { c } = client([
    json({ data: [{ id: "1", type: "products", attributes: {} }], links: { next: "x" } }),
    json({ data: [{ id: "2", type: "products", attributes: {} }], links: {} }),
  ], calls);
  const all = await c.listAll("products", { store_id: "9" });
  assert.deepEqual(all.map((r) => r.id), ["1", "2"]);
  assert.match(calls[0], /filter%5Bstore_id%5D=9/);
  assert.match(calls[0], /page%5Bnumber%5D=1/);
  assert.match(calls[1], /page%5Bnumber%5D=2/);
  assert.ok(calls[0].endsWith("|Bearer k"));
});

test("retries on 429 using retry-after, then succeeds", async () => {
  const { c, sleeps } = client([
    new Response("", { status: 429, headers: { "retry-after": "2" } }),
    json({ data: [], links: {} }),
  ]);
  assert.deepEqual(await c.listAll("orders"), []);
  assert.deepEqual(sleeps, [2000]);
});

test("retries 5xx with backoff then throws after max retries", async () => {
  const { c, sleeps } = client([500, 500, 500, 500].map((s) => new Response("", { status: s })));
  await assert.rejects(() => c.listAll("orders"), LemonSqueezyApiError);
  assert.deepEqual(sleeps, [500, 1000, 2000]);
});

test("401 raises a key error without retry", async () => {
  const { c, sleeps } = client([new Response("", { status: 401 })]);
  await assert.rejects(() => c.listAll("stores"), /rejected the API key/);
  assert.equal(sleeps.length, 0);
});

test("download surfaces expired link without retry", async () => {
  const { c } = client([]);
  const expired = new LemonSqueezyClient({
    apiKey: "k",
    fetchImpl: (async () => new Response("", { status: 403 })) as unknown as typeof fetch,
  });
  await assert.rejects(() => expired.download("https://x"), /expired/);
  assert.ok(c);
});

test("token bucket waits when empty", async () => {
  let now = 0;
  const slept: number[] = [];
  const bucket = new TokenBucket(2, 1 / 1000, () => now, async (ms) => { slept.push(ms); now += ms; });
  await bucket.take(); await bucket.take(); await bucket.take();
  assert.deepEqual(slept, [1000]);
});
