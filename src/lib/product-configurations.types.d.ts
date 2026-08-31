import type { CheckoutCustomData } from "./checkout-custom-data.types";
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

export interface ResolvedProductConfiguration {
  price: number;
  selectedOption?: ProductOption;
  selectedBundleChoices: Array<{
    bundle: ProductBundle;
    choice: ProductBundleChoice;
  }>;
  custom: CheckoutCustomData;
}

export type ConfigurableProduct = Pick<
  Product,
  "price" | "options" | "bundles"
>;
