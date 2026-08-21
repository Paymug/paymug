export interface StripeCheckoutDetails {
  productId: string;
  customAmount?: number;
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
