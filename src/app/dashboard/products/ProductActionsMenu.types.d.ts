import type { ProductStatus } from "@/lib/types";

export interface ProductActionsMenuProps {
  id: string;
  name: string;
  status: ProductStatus;
}

export interface ProductActionsMenuPosition {
  left: number;
  top: number;
}

export interface ProductActionResponse {
  error?: string;
  product?: {
    id: string;
  };
}
