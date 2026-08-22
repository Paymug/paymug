import type { CheckoutCustomData } from "@/lib/checkout-custom-data.types";

export interface StripeCheckoutDetails {
  productId: string;
  customAmount?: number;
  custom?: CheckoutCustomData;
  customerEmail: string;
  customerName?: string;
  githubUsername?: string;
  discountCode?: string;
  marketingOptIn: boolean;
}

export interface StripeCheckoutButtonProps extends StripeCheckoutDetails {
  disabled: boolean;
  label?: string;
}
