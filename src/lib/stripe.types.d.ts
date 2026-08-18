import type { PayPalMode } from "./types";

export interface StripeAccount {
  id: string;
}

export interface StripeCheckoutSession {
  id: string;
  url: string | null;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  payment_intent: string | null;
  amount_total: number | null;
  currency: string | null;
  client_reference_id: string | null;
  metadata: Record<string, string>;
  customer_details?: {
    email?: string | null;
    name?: string | null;
  } | null;
}

export interface CreateStripeCheckoutSessionInput {
  secretKey: string;
  mode: PayPalMode;
  orderId: string;
  productName: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  /** When set, creates a Stripe subscription Checkout session. */
  subscription?: {
    interval: "week" | "month" | "year";
    intervalCount: number;
    trialDays?: number;
    discount?: {
      amountOffCents: number;
      duration: "once" | "repeating";
      durationInMonths?: number;
    };
  };
  metadata?: Record<string, string>;
}
