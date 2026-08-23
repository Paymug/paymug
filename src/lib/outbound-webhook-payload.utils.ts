import { normalizeCheckoutCustomData } from "./checkout-custom-data";
import type { FeatureRecord } from "./feature-records.types";
import type { Order } from "./types";

function centsToAmount(cents: number): number {
  return cents / 100;
}

function normalizeMoneyField(
  data: Record<string, unknown>,
  field: string,
): void {
  const value = data[field];
  if (typeof value !== "number" || !Number.isFinite(value)) return;
  const centsField = `${field}Cents`;
  if (typeof data[centsField] === "number") return;
  data[field] = centsToAmount(value);
  data[centsField] = value;
}

export function createOrderWebhookData(order: Order) {
  return {
    ...order,
    amount: centsToAmount(order.amount),
    amountCents: order.amount,
    ...(order.productPrice !== undefined
      ? {
          productPrice: centsToAmount(order.productPrice),
          productPriceCents: order.productPrice,
        }
      : {}),
    discountAmount: centsToAmount(order.discountAmount),
    discountAmountCents: order.discountAmount,
    transactionFeeAmount: centsToAmount(order.transactionFeeAmount),
    transactionFeeAmountCents: order.transactionFeeAmount,
  };
}

export function createFeatureWebhookData(record: FeatureRecord) {
  const storedAmount = Number(record.data.amount);
  const amountCents = Number.isFinite(storedAmount)
    ? record.feature === "subscriptions"
      ? Math.round(storedAmount * 100)
      : Math.round(storedAmount)
    : undefined;
  return {
    ...record,
    custom: normalizeCheckoutCustomData(record.data.custom),
    ...(amountCents !== undefined
      ? { amount: centsToAmount(amountCents), amountCents }
      : {}),
    ...(typeof record.data.currency === "string"
      ? { currency: record.data.currency }
      : {}),
  };
}

export function normalizeLegacyWebhookRequestBody(requestBody: string): string {
  try {
    const payload = JSON.parse(requestBody) as Record<string, unknown>;
    if (!payload.data || typeof payload.data !== "object") return requestBody;
    const data = payload.data as Record<string, unknown>;
    normalizeMoneyField(data, "amount");
    normalizeMoneyField(data, "productPrice");
    normalizeMoneyField(data, "discountAmount");
    normalizeMoneyField(data, "transactionFeeAmount");
    return JSON.stringify(payload);
  } catch {
    return requestBody;
  }
}
