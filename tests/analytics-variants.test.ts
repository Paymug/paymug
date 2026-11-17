import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeRevenueByVariant } from "../src/lib/analytics-commerce.utils";

test("revenue by variant groups paid, separates refunds, skips variantless", () => {
  const rows = summarizeRevenueByVariant([
    { productId: "p", variantId: "a", variantName: "Basic", status: "paid", amount: 1000 },
    { productId: "p", variantId: "a", variantName: "Basic", status: "paid", amount: 1000 },
    { productId: "p", variantId: "b", variantName: "Pro", status: "paid", amount: 5000 },
    { productId: "p", variantId: "b", variantName: "Pro", status: "refunded", amount: 5000 },
    { productId: "p", variantId: "b", variantName: "Pro", status: "pending", amount: 5000 },
    { productId: "p", status: "paid", amount: 99 },
  ]);
  assert.deepEqual(rows.map((r) => [r.variantName, r.orders, r.revenue, r.refunds]), [
    ["Pro", 1, 5000, 5000],
    ["Basic", 2, 2000, 0],
  ]);
});
