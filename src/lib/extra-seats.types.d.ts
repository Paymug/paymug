import type { Product } from "./types";

export interface ProductExtraSeatTier {
  /** First extra seat (1-based) this per-seat price applies to. */
  from: number;
  /** Price per extra seat in cents. */
  price: number;
}

export type ExtraSeatProduct = Pick<
  Product,
  "generateLicense" | "licenseSeatLimit" | "extraSeatsEnabled" | "extraSeatTiers"
>;
