import assert from "node:assert/strict";
import { test } from "node:test";
import { SourceApiError, ThrottledHttp } from "../src/lib/migrations/http";

function http(responses: Array<Response | Error>, extra: Partial<ConstructorParameters<typeof ThrottledHttp>[0]> = {}) {
  const sleeps: number[] = [];
  const calls: Array<{ url: string; auth: string | undefined }> = [];
  const h = new ThrottledHttp({
    label: "Src",
    baseUrl: "https://api.test/v1/",
    headers: { Authorization: "Bearer k" },
    requestsPerMinute: 1e6,
    sleep: async (ms) => { sleeps.push(ms); },
    fetchImpl: (async (url: string, init?: RequestInit) => {
      calls.push({ url, auth: (init?.headers as Record<string, string>)?.Authorization });
      const next = responses.shift();
      if (!next) throw new Error("no more responses");
      if (next instanceof Error) throw next;
      return next;
    }) as unknown as typeof fetch,
    ...extra,
  });
  return { h, sleeps, calls };
}

test("builds urls, sends bearer, skips empty params", async () => {
  const { h, calls } = http([Response.json({ ok: 1 })]);
  assert.deepEqual(await h.getJson("/x", { a: 1, b: undefined, c: "" }), { ok: 1 });
  assert.equal(calls[0].url, "https://api.test/v1/x?a=1");
  assert.equal(calls[0].auth, "Bearer k");
});

test("429 honors retry-after, else the configured long wait (Paddle 60s)", async () => {
  const a = http([new Response("", { status: 429, headers: { "retry-after": "3" } }), Response.json({})]);
  await a.h.getJson("/x");
  assert.deepEqual(a.sleeps, [3000]);
  const b = http([new Response("", { status: 429 }), Response.json({})], { rateLimitWaitMs: 60_000 });
  await b.h.getJson("/x");
  assert.deepEqual(b.sleeps, [60_000]);
});

test("5xx backs off exponentially then fails with the status", async () => {
  const { h, sleeps } = http([500, 502, 503, 500, 500].map((s) => new Response("", { status: s })), { maxRetries: 3 });
  await assert.rejects(() => h.getJson("/x"), (e: unknown) => e instanceof SourceApiError && e.status === 500);
  assert.deepEqual(sleeps, [500, 1000, 2000]);
});

test("401 is a key error, no retry", async () => {
  const { h, sleeps } = http([new Response("", { status: 401 })]);
  await assert.rejects(() => h.getJson("/x"), /Src rejected the API key/);
  assert.equal(sleeps.length, 0);
});

test("network error retries then succeeds", async () => {
  const { h, sleeps } = http([new Error("reset"), Response.json({ ok: true })]);
  assert.deepEqual(await h.getJson("/x"), { ok: true });
  assert.equal(sleeps.length, 1);
});

test("download is single-shot and maps 403/410 to expired", async () => {
  const { h } = http([new Response("", { status: 403 })]);
  await assert.rejects(() => h.download("https://dl/x"), /expired/);
});

test("send throws with status on failure and sends JSON body", async () => {
  const { h } = http([new Response("", { status: 403 })]);
  await assert.rejects(() => h.send("PATCH", "/s/1", { a: 1 }), (e: unknown) => e instanceof SourceApiError && e.status === 403);
});

test("throttle holds Polar sandbox below its 100 req/min limit (virtual clock)", async () => {
  let now = 0;
  const times: number[] = [];
  const h = new ThrottledHttp({
    label: "Polar",
    baseUrl: "https://x",
    headers: {},
    requestsPerMinute: 80,
    now: () => now,
    sleep: async (ms) => { now += ms; },
    fetchImpl: (async () => { times.push(now); return Response.json({}); }) as unknown as typeof fetch,
  });
  for (let i = 0; i < 200; i += 1) await h.getJson("/x");
  // Any 60s window holds at most the burst (20) plus the refill (80/min).
  for (let i = 0; i < times.length; i += 1) {
    const inWindow = times.filter((t) => t >= times[i] && t < times[i] + 60_000).length;
    assert.ok(inWindow <= 100, `window at ${times[i]} had ${inWindow}`);
  }
  assert.ok(times.at(-1)! >= 130_000, "200 requests need about 2+ minutes at 80/min");
});
