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
  mode?: "payment" | "subscription" | "setup";
  /** Subscription id (unexpanded) when `mode` is "subscription". */
  subscription?: string | null;
  customer?: string | null;
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
  /** Enable Stripe Tax (automatic_tax) on the Checkout Session. */
  automaticTax?: boolean;
}

export interface StripeTaxSettings {
  status: "active" | "pending";
  defaults?: {
    tax_behavior?: "exclusive" | "inclusive" | "inferred_by_currency" | null;
    tax_code?: string | null;
  };
  head_office?: { address?: { country?: string | null } | null } | null;
}

export interface StripeInvoice {
  id: string;
  /** Present on API versions before 2025-03-31 (basil). */
  subscription?: string | null;
  parent?: {
    subscription_details?: {
      subscription?: string | null;
      metadata?: Record<string, string> | null;
    } | null;
  } | null;
  billing_reason?: string | null;
  amount_paid: number;
  currency: string;
  /** Unix seconds. */
  created: number;
  status_transitions?: { paid_at?: number | null } | null;
  attempt_count?: number;
  next_payment_attempt?: number | null;
}

export interface StripeSubscription {
  id: string;
  /** "active" | "trialing" | "past_due" | "unpaid" | "canceled" | "paused" | "incomplete" | "incomplete_expired" */
  status: string;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, string> | null;
}
