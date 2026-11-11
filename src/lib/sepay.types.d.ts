import type { PayPalMode } from "./types";

export interface SepayCheckoutInput {
  merchantId: string;
  secretKey: string;
  orderId: string;
  amountCents: number;
  description: string;
  successUrl: string;
  errorUrl: string;
  cancelUrl: string;
}

export interface SepayCheckoutFields {
  operation: "PURCHASE";
  order_invoice_number: string;
  order_amount: number;
  currency: string;
  order_description: string;
  success_url: string;
  error_url: string;
  cancel_url: string;
  merchant: string;
  signature: string;
}

export interface SepayCheckoutSession {
  orderId: string;
  checkoutUrl: string;
  fields: SepayCheckoutFields;
  mode: PayPalMode;
}

export interface SepayIpnPayload {
  timestamp?: number;
  notification_type?: "ORDER_PAID" | "TRANSACTION_VOID" | string;
  order: {
    id?: string;
    order_id?: string;
    order_status?: string;
    order_currency?: string;
    order_amount?: string | number;
    order_invoice_number?: string;
  };
  transaction?: {
    id?: string;
    transaction_id?: string;
    transaction_status?: string;
    transaction_amount?: string | number;
    transaction_currency?: string;
  };
}
