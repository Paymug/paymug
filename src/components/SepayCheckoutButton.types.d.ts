import type { StripeCheckoutDetails } from "./StripeCheckoutButton.types";

export type SepayCheckoutDetails = StripeCheckoutDetails;

export interface SepayCheckoutButtonProps extends SepayCheckoutDetails {
  disabled: boolean;
  label?: string;
}

export interface SepayCheckoutResponse {
  checkoutUrl?: string;
  fields?: Record<string, string | number>;
  error?: string;
}
