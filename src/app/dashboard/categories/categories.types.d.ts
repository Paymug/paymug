import type { Product, ProductCategory } from "@/lib/types";

export interface CategoriesWorkspaceProps {
  categories: ProductCategory[];
  products: Product[];
}

export interface CategoryModalProps {
  category?: ProductCategory;
  products: Product[];
  onClose(): void;
}

export interface CategoryApiResponse {
  category?: ProductCategory;
  deleted?: boolean;
  reordered?: boolean;
  error?: string;
}
