import assert from "node:assert/strict";
import { test } from "node:test";
import {
  allApiKeyScopes,
  hasApiKeyScope,
  normalizeApiKeyScopes,
} from "../src/lib/api-key-scopes";
import {
  isCancellableSubscriptionStatus,
  isTerminalSubscriptionStatus,
} from "../src/lib/subscription-cancel.utils";
import { cancelStripeSubscription } from "../src/lib/stripe";

test("only live subscriptions can be cancelled", () => {
  for (const status of ["active", "trialing", "past_due", "suspended", "paused", "Active"]) {
    assert.equal(isCancellableSubscriptionStatus(status), true, status);
  }
  for (const status of ["cancelled", "expired", "approval_cancelled", "migration_pending", "pending"]) {
    assert.equal(isCancellableSubscriptionStatus(status), false, status);
  }
});

test("terminal statuses are treated as already cancelled", () => {
  for (const status of ["cancelled", "approval_cancelled", "expired", "superseded"]) {
    assert.equal(isTerminalSubscriptionStatus(status), true, status);
  }
  assert.equal(isTerminalSubscriptionStatus("active"), false);
});

test("subscriptions scope allows read and write, never delete", () => {
  assert.ok(allApiKeyScopes.includes("subscriptions:read"));
  assert.ok(allApiKeyScopes.includes("subscriptions:write"));
  assert.ok(!allApiKeyScopes.includes("subscriptions:delete" as never));
  const granted = normalizeApiKeyScopes(["subscriptions:write"]);
  assert.ok(hasApiKeyScope(granted, "subscriptions", "read"));
  assert.ok(hasApiKeyScope(granted, "subscriptions", "write"));
});

test("cancelStripeSubscription sends DELETE and surfaces Stripe errors", async () => {
  const original = globalThis.fetch;
  const calls: Array<{ url: string; method?: string; auth?: string }> = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({
      url,
      method: init?.method,
      auth: (init?.headers as Record<string, string>)?.Authorization,
    });
    return url.endsWith("sub_missing")
      ? new Response(JSON.stringify({ error: { message: "No such subscription" } }), { status: 404 })
      : new Response(JSON.stringify({ id: "sub_1", status: "canceled" }));
  }) as typeof fetch;
  try {
    await cancelStripeSubscription("sk_test_x", "sub_1");
    assert.equal(calls[0].method, "DELETE");
    assert.match(calls[0].url, /\/subscriptions\/sub_1$/);
    assert.equal(calls[0].auth, "Bearer sk_test_x");
    await assert.rejects(
      () => cancelStripeSubscription("sk_test_x", "sub_missing"),
      /No such subscription/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
