import type { CheckoutCustomData } from "./checkout-custom-data.types";
import type { ExtraSeatProduct } from "./extra-seats.types";
import type { Product } from "./types";

export interface ProductOption {
  id: string;
  name: string;
  price: number;
}

export interface ProductBundleChoice {
  id: string;
  name: string;
  price: number;
}

export interface ProductBundle {
  id: string;
  name: string;
  selectionMode: "single" | "multiple";
  choices: ProductBundleChoice[];
}

/** An existing license an order is adding seats to. */
export interface SeatAddOnContext {
  /** Order the license was originally issued for. */
  orderId: string;
  /** Extra seats the license already has. */
  existingExtraSeats: number;
}

export interface ResolvedProductConfiguration {
  price: number;
  selectedOption?: ProductOption;
  selectedBundleChoices: Array<{
    bundle: ProductBundle;
    choice: ProductBundleChoice;
  }>;
  /** Extra license seats the buyer added (0 when unavailable). */
  extraSeats: number;
  extraSeatsPrice: number;
  custom: CheckoutCustomData;
}

export type ConfigurableProduct = Pick<
  Product,
  "price" | "options" | "bundles"
> &
  Partial<ExtraSeatProduct>;
