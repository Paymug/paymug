import type {
  ProductBundle,
  ProductOption,
} from "@/lib/product-configurations.types";

export interface ProductConfigurationEditorProps {
  currency: string;
  defaultPrice: number;
  options: ProductOption[];
  bundles: ProductBundle[];
  onOptionsChange(options: ProductOption[]): void;
  onBundlesChange(bundles: ProductBundle[]): void;
}
