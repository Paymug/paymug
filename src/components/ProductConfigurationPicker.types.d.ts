import type {
  ProductBundle,
  ProductOption,
} from "@/lib/product-configurations.types";

export interface ProductConfigurationPickerProps {
  options: ProductOption[];
  bundles: ProductBundle[];
  selectedOptionId?: string;
  selectedBundleChoiceIds: Record<string, string[]>;
  currency: string;
}
