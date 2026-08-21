import type {
  CheckoutPricing,
  TransactionFeeProduct,
} from "./product-pricing.types";

export function calculateTransactionFee(
  subtotal: number,
  transactionFeeType: TransactionFeeProduct["transactionFeeType"],
  transactionFeeValue: number
): number {
  if (transactionFeeValue <= 0 || subtotal <= 0) return 0;
  return transactionFeeType === "percentage"
    ? Math.round((subtotal * transactionFeeValue) / 10000)
    : transactionFeeValue;
}

export function calculateCheckoutPricing(
  product: TransactionFeeProduct,
  discountAmount = 0,
  price = product.price,
): CheckoutPricing {
  const normalizedDiscount = Math.min(
    Math.max(0, discountAmount),
    Math.max(0, price)
  );
  const subtotal = price - normalizedDiscount;
  const transactionFeeAmount = calculateTransactionFee(
    subtotal,
    product.transactionFeeType,
    product.transactionFeeValue
  );

  return {
    subtotal: price,
    discountAmount: normalizedDiscount,
    transactionFeeAmount,
    total: subtotal + transactionFeeAmount,
  };
}
