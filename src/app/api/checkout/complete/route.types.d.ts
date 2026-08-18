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
