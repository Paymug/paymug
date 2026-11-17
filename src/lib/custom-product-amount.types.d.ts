import type { Product } from "./types";

export type CustomAmountProduct = Pick<
  Product,
  "price" | "billingType" | "customAmountEnabled"
> & {
  /** Variant pay-what-you-want floor, in cents. */
  minPrice?: number | null;
};
