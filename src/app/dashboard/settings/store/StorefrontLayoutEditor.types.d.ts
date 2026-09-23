import type { Product, ProductCategory } from "@/lib/types";

export interface StorefrontLayoutEditorProps {
  categories: ProductCategory[];
  products: Product[];
  categoryProductOrder: Record<string, string[]>;
  displayPurchases: boolean;
}
