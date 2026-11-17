import type {
  ProductBundle,
  ProductOption,
} from "@/lib/product-configurations.types";

export interface ProductConfigurationEditorProps {
  currency: string;
  defaultPrice: number;
  /** Saved product ID; enables per-variant overrides. */
  productId?: string;
  options: ProductOption[];
  bundles: ProductBundle[];
  onOptionsChange(options: ProductOption[]): void;
  onBundlesChange(bundles: ProductBundle[]): void;
}
