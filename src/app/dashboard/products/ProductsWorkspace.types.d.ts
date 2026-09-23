import type { PayPalMode, Product } from "@/lib/types";

export interface ProductPerformance {
  sales: number;
  revenue: number;
}

export interface ProductPerformanceSummary {
  byProduct: Record<string, ProductPerformance>;
  totals: ProductPerformance;
}

export interface ProductsWorkspaceProps {
  products: Product[];
  environment: PayPalMode;
  performance: ProductPerformanceSummary;
  currency: string;
}
