import type { CheckoutCustomData } from "@/lib/checkout-custom-data.types";

export interface CompleteFreePurchaseInput {
  productId: string;
  customAmount?: number;
  customerEmail: string;
  customerName?: string;
  discountCode?: string;
  affiliateCode?: string;
  marketingOptIn?: boolean;
  custom?: CheckoutCustomData;
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
