import type { FeatureRecord } from "./feature-records.types";
import type { Order } from "./types";
import type { PayPalWebhookEvent } from "./paypal-webhooks.types";

export interface TransactionalEmailContent {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export interface EmailSenderOptions {
  replyTo?: string;
  name?: string;
}

export interface PurchaseConfirmationEmailInput {
  order: Order;
  deliveryContent?: string;
  licenseKey?: string;
  license?: FeatureRecord;
  requestUrl: string;
  storeLogo?: string;
}

export interface OrderPaymentFailedEmailInput {
  order: Order;
  requestUrl: string;
  storeLogo?: string;
}

export interface SubscriptionApprovalEmailInput {
  subscription: FeatureRecord;
  requestUrl: string;
  storeLogo?: string;
}

export interface SubscriptionStatusEmailInput {
  subscription: FeatureRecord;
  status: string;
  requestUrl?: string;
  storeLogo?: string;
}

export interface PayPalSubscriptionEventEmailInput {
  subscription: FeatureRecord;
  event: PayPalWebhookEvent;
  isNewPayment: boolean;
  previousStatus: string;
}

export interface EmailLayoutInput {
  storeName: string;
  storeLogo?: string;
  eyebrow?: string;
  title: string;
  intro: string;
  rows?: Array<{ label: string; value: string }>;
  detailTitle?: string;
  detail?: string;
  actionLabel?: string;
  actionUrl?: string;
  footer?: string;
}
