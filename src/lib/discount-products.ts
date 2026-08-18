import "server-only";

import { findProductById } from "./db";
import type { FeatureRecordInput } from "./feature-records.types";

export async function applyDiscountProductScope(
  userId: string,
  storeId: string,
  input: FeatureRecordInput
): Promise<FeatureRecordInput> {
  const rawSubscriptionPeriods = input.data?.subscriptionPeriods;
  const subscriptionPeriods =
    rawSubscriptionPeriods === undefined ||
    rawSubscriptionPeriods === null ||
    String(rawSubscriptionPeriods).trim() === ""
      ? null
      : Number(rawSubscriptionPeriods);
  if (
    subscriptionPeriods !== null &&
    (!Number.isInteger(subscriptionPeriods) ||
      subscriptionPeriods < 1 ||
      subscriptionPeriods > 120)
  ) {
    throw new Error("Subscription discount periods must be between 1 and 120");
  }
  const storedProductIds =
    input.data?.productIds ?? input.data?.productId ?? "all";
  const productIds = (
    Array.isArray(storedProductIds)
      ? storedProductIds.map(String)
      : String(storedProductIds).split(",")
  ).filter(Boolean);
  if (productIds.length === 0 || productIds.includes("all")) {
    return {
      ...input,
      data: {
        ...input.data,
        subscriptionPeriods,
        storeId,
        productIds: ["all"],
        productNames: "All products",
      },
    };
  }
  const products = await Promise.all(
    [...new Set(productIds)].map((productId) =>
      findProductById(productId)
    )
  );
  if (
    products.some(
      (product) =>
        !product ||
        product.userId !== userId ||
        product.storeId !== storeId ||
        (input.environment && product.environment !== input.environment)
    )
  ) {
    throw new Error("Selected product was not found in this store");
  }
  const selectedProducts = products.filter(
    (product): product is NonNullable<typeof product> => Boolean(product)
  );
  return {
    ...input,
    data: {
      ...input.data,
      subscriptionPeriods,
      storeId,
      productIds: selectedProducts.map((product) => product.id),
      productNames: selectedProducts
        .map((product) => product.name)
        .join(", "),
    },
  };
}
