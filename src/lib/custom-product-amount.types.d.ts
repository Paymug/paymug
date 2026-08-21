import type { Product } from "./types";

export type CustomAmountProduct = Pick<
  Product,
  "price" | "billingType" | "customAmountEnabled"
>;
