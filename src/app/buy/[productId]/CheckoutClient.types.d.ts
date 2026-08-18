export interface CheckoutClientProps {
  productId: string;
  productName: string;
  productPrice: number;
  affiliateRef?: string;
  initialDiscountCode?: string;
  initialTransactionFeeAmount: number;
  paypalClientId?: string;
  stripeEnabled: boolean;
  mode: "sandbox" | "live";
  currency: string;
  /** Recurring product subscription checkout. */
  isSubscription?: boolean;
  billingSummary?: string | null;
  priceSuffix?: string;
}

export interface CheckoutPricingPreview {
  subtotal: number;
  discountAmount: number;
  transactionFeeAmount: number;
  total: number;
}

export interface DiscountPreviewResponse extends CheckoutPricingPreview {
  valid: true;
  code?: string;
  subscriptionPeriods?: number;
}

export interface CompleteFreePurchaseInput {
  productId: string;
  customerEmail: string;
  customerName?: string;
  discountCode?: string;
  affiliateCode?: string;
  marketingOptIn?: boolean;
}

export interface CompleteFreePurchaseResponse {
  order: {
    id: string;
    status: string;
    productName: string;
    amount: number;
    currency: string;
    customerEmail: string;
    deliveryContent?: string;
    paidAt?: string;
  };
}
