import assert from "node:assert/strict";
import { test } from "node:test";
import type { CompatLicense } from "../src/lib/lemonsqueezy/license-compat";
import { dodoActivate, dodoDeactivate, dodoValidate } from "../src/lib/migrations/dodo/license-compat";
import { polarActivate, polarDeactivate, polarValidate } from "../src/lib/migrations/polar/license-compat";

const license = (data: Record<string, unknown> = {}, status = "active"): CompatLicense => ({
  id: "lic1", key: "AAAA-BBBB", status, environment: "live", createdAt: "2026-01-01T00:00:00Z",
  data: { seatLimit: 2, customerEmail: "a@x.com", productId: "p1", product: "Kit", storeId: "s1", lemonSqueezyInstances: [{ id: "i1", name: "laptop", createdAt: "2026-02-01T00:00:00Z" }], ...data },
});

test("polar validate: key object, activation lookup, not found", () => {
  const ok = polarValidate(license(), {});
  assert.equal(ok.status, 200);
  assert.equal(ok.body.key, "AAAA-BBBB");
  assert.equal(ok.body.status, "granted");
  assert.equal(ok.body.limit_activations, 2);
  assert.equal(ok.body.usage, 1);
  assert.equal(ok.body.activation, null);
  assert.equal((polarValidate(license(), { activationId: "i1" }).body.activation as { label: string }).label, "laptop");
  assert.equal(polarValidate(license(), { activationId: "nope" }).status, 404);
  assert.equal(polarValidate(undefined, {}).status, 404);
  assert.equal(polarValidate(license({}, "inactive"), {}).body.status, "disabled");
  assert.equal(polarValidate(license({ expiresAt: "2000-01-01T00:00:00Z" }), {}).body.status, "revoked");
});

test("polar activate: respects limit, adds instance with label", () => {
  const r = polarActivate(license({ lemonSqueezyInstances: [] }), { label: "mac" }, "new1", 0);
  assert.equal(r.status, 200);
  assert.equal(r.body.label, "mac");
  assert.equal(r.nextInstances!.length, 1);
  assert.equal((r.body.license_key as { usage: number }).usage, 1);
  const full = polarActivate(license({ seatLimit: 1 }), { label: "x" }, "n");
  assert.equal(full.status, 403);
  assert.match(String(full.body.detail), /limit/);
  const unlimited = polarActivate(license({ seatLimit: null }), { label: "x" }, "n");
  assert.equal(unlimited.status, 200);
  assert.equal(polarActivate(license({}, "inactive"), { label: "x" }, "n").status, 403);
});

test("polar deactivate: 204 and removes the instance", () => {
  const r = polarDeactivate(license(), { activationId: "i1" });
  assert.equal(r.status, 204);
  assert.deepEqual(r.nextInstances, []);
  assert.equal(polarDeactivate(license(), { activationId: "zzz" }).status, 404);
});

test("dodo validate: valid flag only, instance must exist", () => {
  assert.deepEqual(dodoValidate(license(), {}).body, { valid: true });
  assert.deepEqual(dodoValidate(license(), { instanceId: "i1" }).body, { valid: true });
  assert.deepEqual(dodoValidate(license(), { instanceId: "zzz" }).body, { valid: false });
  assert.deepEqual(dodoValidate(undefined, {}).body, { valid: false });
  assert.deepEqual(dodoValidate(license({}, "inactive"), {}).body, { valid: false });
  assert.deepEqual(dodoValidate(license({ expiresAt: "2000-01-01T00:00:00Z" }), {}).body, { valid: false });
});

test("dodo activate: 201 instance, 403 inactive, 404 missing, 422 limit", () => {
  const ok = dodoActivate(license({ lemonSqueezyInstances: [] }), { name: "srv" }, "lki_9", 0);
  assert.equal(ok.status, 201);
  assert.equal(ok.body.id, "lki_9");
  assert.equal(ok.body.name, "srv");
  assert.equal((ok.body.product as { product_id: string }).product_id, "p1");
  assert.equal((ok.body.customer as { email: string }).email, "a@x.com");
  assert.equal(dodoActivate(license({ seatLimit: 1 }), { name: "x" }, "n").status, 422);
  assert.equal(dodoActivate(license({}, "inactive"), { name: "x" }, "n").status, 403);
  assert.equal(dodoActivate(undefined, { name: "x" }, "n").status, 404);
});

test("dodo deactivate: 200, 403 unknown instance, 404 missing key", () => {
  const ok = dodoDeactivate(license(), { instanceId: "i1" });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.nextInstances, []);
  assert.equal(dodoDeactivate(license(), { instanceId: "zzz" }).status, 403);
  assert.equal(dodoDeactivate(undefined, { instanceId: "i1" }).status, 404);
});
