import type { OrderGateway, OrderStatus } from "./types";

export type InvoiceViewerRole = "merchant" | "customer";

export interface Invoice {
  /** Same as the order id the invoice is generated from. */
  id: string;
  number: string;
  status: OrderStatus;
  issuedAt: string;
  paidAt?: string;
  storeName: string;
  storeLogoImageUrl?: string;
  customerName: string;
  customerEmail: string;
  productName: string;
  variantName?: string;
  currency: string;
  /** Product price before discount, in cents. */
  subtotal: number;
  discountCode?: string;
  discountAmount: number;
  transactionFeeAmount: number;
  total: number;
  gateway: OrderGateway;
  environment: "sandbox" | "live";
  /** Gateway payment reference (capture id / payment intent / order id). */
  paymentReference?: string;
}

export interface InvoiceAccess {
  invoice: Invoice;
  role: InvoiceViewerRole;
  /** True when the customer can still pay this invoice. */
  payable: boolean;
}
