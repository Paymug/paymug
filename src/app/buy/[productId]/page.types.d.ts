import type { CheckoutSearchParams } from "@/lib/checkout-custom-data.types";

export interface BuyPageSearchParams extends CheckoutSearchParams {
  cancelled?: string;
  discount?: string;
  preview?: string;
  ref?: string;
  amount?: string;
}

export interface BuyPageProps {
  params: Promise<{ productId: string }>;
  searchParams: Promise<BuyPageSearchParams>;
}
