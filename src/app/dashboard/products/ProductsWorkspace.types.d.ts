import type { PayPalMode, Product } from "@/lib/types";

export interface ProductPerformance {
  sales: number;
  revenue: number;
  /** Storefront/checkout visits in the selected timeframe. */
  visits: number;
  /** Purchases ÷ visits (0–1) in the selected timeframe, or null when there are no visits. */
  conversion: number | null;
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
