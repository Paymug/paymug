import type { Product } from "@/lib/types";

export interface StorefrontProductGridProps {
  products: Product[];
  isTestMode: boolean;
  displayPurchases: boolean;
  className?: string;
}
