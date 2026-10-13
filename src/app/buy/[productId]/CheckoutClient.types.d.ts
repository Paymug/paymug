import type { CheckoutCustomData } from "@/lib/checkout-custom-data.types";

export interface CheckoutClientProps {
  storeId: string;
  productId: string;
  productName: string;
  productPrice: number;
  defaultProductPrice: number;
  customAmountEnabled: boolean;
  allowNote: boolean;
  notePlaceholder?: string | null;
  customAmount?: number;
  custom: CheckoutCustomData;
  extraSeatsEnabled?: boolean;
  extraSeats?: number;
  extraSeatLabel?: string;
  /** Cost of the extra seats in cents, already included in productPrice. */
  extraSeatsPrice?: number;
  /** The order only adds seats to an existing license. */
  seatAddOn?: boolean;
  /** Seat add-on only: most seats that can still be added. */
  maxExtraSeats?: number;
  /** Seat add-on only: changes the seat count without leaving the page. */
  onExtraSeatsChange?(seats: number): void;
  /** Email of the license owner; the buyer cannot change it. */
  lockedEmail?: string;
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
  abandonmentEnabled?: boolean;
  abandonmentQuestion?: string | null;
  abandonmentOptions?: string[];
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
  customAmount?: number;
  custom?: CheckoutCustomData;
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
