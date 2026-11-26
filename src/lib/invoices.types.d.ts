import type { OrderGateway, OrderStatus } from "./types";

export type InvoiceViewerRole = "merchant" | "customer";

export interface InvoiceItem {
  description: string;
  quantity: number;
  /** In cents. Omitted when a per-unit price cannot be stated exactly. */
  unitAmount?: number;
  /** In cents. Omitted when the line is covered by another line's amount. */
  amount?: number;
}

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
  items: InvoiceItem[];
  currency: string;
  /** Sum of the items before discount, in cents. */
  subtotal: number;
  discountCode?: string;
  discountAmount: number;
  transactionFeeAmount: number;
  /** Gap between the charged total and the lines above (tax, trial, proration). */
  adjustmentAmount: number;
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
