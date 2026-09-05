import type { CustomAmountProduct } from "./custom-product-amount.types";

const maximumCustomAmountCents = 1_000_000_000;

export function parseCustomCheckoutAmount(
  value?: string,
): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const normalized = value.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Custom amount must be a valid non-negative amount");
  }
  const cents = Math.round(Number(normalized) * 100);
  if (cents < 0 || cents > maximumCustomAmountCents) {
    throw new Error("Custom amount is outside the supported range");
  }
  return cents;
}

export function resolveProductCheckoutPrice(
  product: CustomAmountProduct,
  customAmount?: number,
): number {
  if (customAmount === undefined) return product.price;
  if (product.billingType !== "one_time" || !product.customAmountEnabled) {
    throw new Error("This product does not allow a custom checkout amount");
  }
  if (
    !Number.isSafeInteger(customAmount) ||
    customAmount < 0 ||
    customAmount > maximumCustomAmountCents
  ) {
    throw new Error("Custom amount is outside the supported range");
  }
  return customAmount;
}

export function formatCustomCheckoutAmount(customAmount: number): string {
  return (customAmount / 100).toFixed(2).replace(/\.00$/, "");
}
