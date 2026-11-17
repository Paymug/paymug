import assert from "node:assert/strict";
import { test } from "node:test";
import { parseStoreBackup, remapStoreBackupData } from "../src/lib/store-backup.utils";

test("remap rewrites variant ids and the checkout product_option choice", () => {
  const out = remapStoreBackupData(
    { productId: "p1", variantId: "v1", custom: { product_option: "v2", other: "v1" } },
    "store",
    "live",
    {
      products: new Map([["p1", "P1"]]),
      orders: new Map(),
      features: new Map(),
      customers: new Map(),
      variants: new Map([["v1", "V1"], ["v2", "V2"]]),
    },
  ) as Record<string, unknown>;
  assert.equal(out.productId, "P1");
  assert.equal(out.variantId, "V1");
  assert.deepEqual(out.custom, { product_option: "V2", other: "v1" });
});

test("remap without a variants map leaves ids alone (old callers)", () => {
  const out = remapStoreBackupData({ variantId: "v1" }, "s", "live", {
    products: new Map(), orders: new Map(), features: new Map(), customers: new Map(),
  }) as Record<string, unknown>;
  assert.equal(out.variantId, "v1");
});

const base = (variants?: unknown) => ({
  format: "paymug-store-backup", version: 2, sourceStoreId: "s", sourceStoreSlug: "s",
  data: { products: [], orders: [], checkoutReminders: [], featureRecords: [], customers: [], ...(variants ? { variants } : {}) },
});

test("backup parses with and without variants; duplicate variant ids rejected", () => {
  assert.ok(parseStoreBackup(base()));
  assert.ok(parseStoreBackup(base([{ id: "a" }])));
  assert.throws(() => parseStoreBackup(base([{ id: "a" }, { id: "a" }])), /duplicate/);
});
