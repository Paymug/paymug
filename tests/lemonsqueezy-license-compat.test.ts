import assert from "node:assert/strict";
import { test } from "node:test";
import { activateLicense, deactivateLicense, validateLicense, type CompatLicense } from "../src/lib/lemonsqueezy/license-compat";

const lic = (data: Record<string, unknown> = {}, status = "active"): CompatLicense => ({
  id: "L1", key: "KEY-1", status, environment: "live", createdAt: "2026-01-01T00:00:00Z",
  data: { seatLimit: 2, orderId: "o", customerEmail: "a@b.c", product: "Kit", ...data },
});

test("unknown key -> 404 per endpoint flag", () => {
  assert.equal(validateLicense(undefined, {}).status, 404);
  assert.equal(activateLicense(undefined, { instanceName: "x" }, "i").body.activated, false);
  assert.equal(deactivateLicense(undefined, { instanceId: "i" }).body.deactivated, false);
});

test("activate -> validate with instance -> deactivate roundtrip", () => {
  const a = activateLicense(lic(), { instanceName: "laptop" }, "inst-1");
  assert.equal(a.body.activated, true);
  assert.equal((a.body.license_key as { activation_usage: number }).activation_usage, 1);
  assert.equal((a.body.license_key as { activation_limit: number }).activation_limit, 2);
  assert.equal((a.body.license_key as { status: string }).status, "active");
  const withInst = lic({ lemonSqueezyInstances: a.nextInstances });
  const v = validateLicense(withInst, { instanceId: "inst-1" });
  assert.equal(v.body.valid, true);
  assert.equal((v.body.instance as { name: string }).name, "laptop");
  assert.equal(validateLicense(withInst, { instanceId: "nope" }).body.valid, false);
  const d = deactivateLicense(withInst, { instanceId: "inst-1" });
  assert.equal(d.body.deactivated, true);
  assert.deepEqual(d.nextInstances, []);
  assert.equal(deactivateLicense(withInst, { instanceId: "nope" }).status, 404);
});

test("activation limit enforced; 0/unlimited allowed", () => {
  const full = lic({ seatLimit: 1, lemonSqueezyInstances: [{ id: "a", name: "x", createdAt: "" }] });
  const r = activateLicense(full, { instanceName: "y" }, "b");
  assert.equal(r.status, 400); assert.match(String(r.body.error), /limit/);
  const unlimited = lic({ seatLimit: null, lemonSqueezyInstances: [{ id: "a", name: "x", createdAt: "" }, { id: "b", name: "x", createdAt: "" }] });
  assert.equal(activateLicense(unlimited, { instanceName: "c" }, "c").body.activated, true);
});

test("disabled and expired keys are invalid", () => {
  assert.equal(validateLicense(lic({}, "inactive"), {}).body.valid, false);
  const expired = lic({ expiresAt: "2020-01-01T00:00:00Z" });
  assert.match(String(validateLicense(expired, {}).body.error), /expired/);
  assert.equal(activateLicense(expired, { instanceName: "x" }, "i").body.activated, false);
});

test("validate without instance id on fresh key is valid with status inactive", () => {
  const v = validateLicense(lic(), {});
  assert.equal(v.body.valid, true);
  assert.equal((v.body.license_key as { status: string }).status, "inactive");
});
