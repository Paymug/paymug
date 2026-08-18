import type { Product } from "./types";

export interface CheckoutPricing {
  subtotal: number;
  discountAmount: number;
  transactionFeeAmount: number;
  total: number;
}

export type TransactionFeeProduct = Pick<
  Product,
  "price" | "transactionFeeType" | "transactionFeeValue"
>;
