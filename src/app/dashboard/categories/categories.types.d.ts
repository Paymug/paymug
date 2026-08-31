import type { ProductCategory } from "@/lib/types";

export interface CategoriesWorkspaceProps {
  categories: ProductCategory[];
}

export interface CategoryModalProps {
  category?: ProductCategory;
  onClose(): void;
}

export interface CategoryApiResponse {
  category?: ProductCategory;
  deleted?: boolean;
  error?: string;
}
