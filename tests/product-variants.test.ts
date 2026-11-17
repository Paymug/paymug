import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getVariantStartingPrice,
  resolveVariant,
  selectVariant,
  type ProductVariantRecord,
  type VariantBaseProduct,
} from "../src/lib/product-variants";

const product: VariantBaseProduct = {
  price: 1000,
  billingType: "one_time",
  intervalUnit: null,
  intervalCount: 1,
  trialDays: 0,
  customAmountEnabled: false,
  productFiles: [],
  generateLicense: true,
  licenseType: "standard",
  licenseSeatLimit: 1,
  licenseUpdatePeriodUnit: null,
  licenseUpdatePeriodCount: 1,
  deliveryContent: "base",
  redirectUrl: null,
};

const variant = (over: Partial<ProductVariantRecord> = {}): ProductVariantRecord => ({
  id: "v1", productId: "p", name: "Pro", slug: "pro", description: "",
  sort: 0, status: "published", price: 2500, ...over,
});

test("no variant returns product defaults", () => {
  assert.equal(resolveVariant(product).price, 1000);
});

test("variant overrides only what it sets", () => {
  const r = resolveVariant(product, variant({ billingType: "subscription", intervalUnit: "month", licenseSeatLimit: 5 }));
  assert.equal(r.price, 2500);
  assert.equal(r.billingType, "subscription");
  assert.equal(r.intervalUnit, "month");
  assert.equal(r.licenseSeatLimit, 5);
  assert.equal(r.generateLicense, true);
  assert.equal(r.deliveryContent, "base");
  assert.equal(r.variantId, "v1");
});

test("null seat limit means unlimited, undefined inherits", () => {
  assert.equal(resolveVariant(product, variant({ licenseSeatLimit: null })).licenseSeatLimit, null);
  assert.equal(resolveVariant(product, variant()).licenseSeatLimit, 1);
});

test("selectVariant prefers requested published, falls back to first by sort", () => {
  const list = [variant({ id: "b", sort: 2 }), variant({ id: "a", sort: 1 }), variant({ id: "d", sort: 0, status: "draft" })];
  assert.equal(selectVariant(list, "b")?.id, "b");
  assert.equal(selectVariant(list, "d")?.id, "a");
  assert.equal(selectVariant(list, null)?.id, "a");
  assert.equal(selectVariant([], "x"), undefined);
});

test("starting price ignores drafts", () => {
  assert.equal(getVariantStartingPrice([variant({ price: 500, status: "draft" }), variant({ id: "x", price: 900 })], 1000), 900);
  assert.equal(getVariantStartingPrice([], 1000), 1000);
});

import { applyVariantToProduct, effectiveProduct, productForOrder } from "../src/lib/product-variants";

const sold = { ...product, variants: [
  variant({ id: "m", name: "Monthly", sort: 0, price: 500, billingType: "subscription", intervalUnit: "month", intervalCount: 1, trialDays: 7 }),
  variant({ id: "l", name: "Lifetime", sort: 1, price: 9900, licenseSeatLimit: null, generateLicense: true }),
] };

test("effectiveProduct applies requested variant", () => {
  const e = effectiveProduct(sold, { product_option: "m" });
  assert.equal(e.price, 500); assert.equal(e.billingType, "subscription");
  assert.equal(e.trialDays, 7); assert.equal(e.variantId, "m"); assert.equal(e.variantName, "Monthly");
  assert.equal(effectiveProduct(sold, { product_option: "l" }).licenseSeatLimit, null);
});

test("effectiveProduct defaults to first published; unknown id falls back", () => {
  assert.equal(effectiveProduct(sold, {}).variantId, "m");
  assert.equal(effectiveProduct(sold, { product_option: "zzz" }).variantId, "m");
  assert.equal(effectiveProduct(sold, undefined).variantId, "m");
});

test("products without variants pass through unchanged", () => {
  assert.equal(effectiveProduct(product, { product_option: "x" }), product);
  assert.equal(applyVariantToProduct(product, null), product);
});

test("productForOrder prefers stored variant id, then custom, even if now a draft", () => {
  const drafted = { ...sold, variants: sold.variants.map((v) => (v.id === "l" ? { ...v, status: "draft" as const } : v)) };
  assert.equal(productForOrder(drafted, { variantId: "l" }).variantId, "l");
  assert.equal(productForOrder(sold, { custom: { product_option: "l" } }).price, 9900);
  assert.equal(productForOrder(sold, {}).variantId, "m");
});

import { seatLimitFromColumn, seatLimitToColumn } from "../src/lib/product-variants";

test("seat limit column: NULL inherits, 0 unlimited", () => {
  assert.equal(seatLimitFromColumn(null), undefined);
  assert.equal(seatLimitFromColumn(0), null);
  assert.equal(seatLimitFromColumn(3), 3);
  assert.equal(seatLimitToColumn(undefined), null);
  assert.equal(seatLimitToColumn(null), 0);
  assert.equal(seatLimitToColumn(4), 4);
  // inherits the product's limit end to end
  assert.equal(resolveVariant(product, variant({ licenseSeatLimit: seatLimitFromColumn(null) })).licenseSeatLimit, 1);
  assert.equal(resolveVariant(product, variant({ licenseSeatLimit: seatLimitFromColumn(0) })).licenseSeatLimit, null);
});

import { resolveProductCheckoutPrice } from "../src/lib/custom-product-amount";

test("PWYW floor comes from the variant", () => {
  const pw = effectiveProduct(
    { ...product, variants: [variant({ id: "p", price: 1000, customAmountEnabled: true, minPrice: 500 })] },
    { product_option: "p" },
  );
  assert.equal(pw.customAmountEnabled, true);
  assert.equal(resolveProductCheckoutPrice(pw as never, 700), 700);
  assert.throws(() => resolveProductCheckoutPrice(pw as never, 300), /at least 5.00/);
});
