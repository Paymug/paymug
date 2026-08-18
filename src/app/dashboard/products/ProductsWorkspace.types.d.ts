import type { PayPalMode, Product } from "@/lib/types";

export interface ProductsWorkspaceProps {
  products: Product[];
  environment: PayPalMode;
}
