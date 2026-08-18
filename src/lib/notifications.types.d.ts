import type { FeatureRecord } from "./feature-records.types";
import type { Order } from "./types";
import type { PayPalWebhookEvent } from "./paypal-webhooks.types";

export type NotificationType =
  | "invoice_created"
  | "payment_received"
  | "order_completed"
  | "payment_failed"
  | "payment_refunded"
  | "affiliate_applied"
  | "subscription_updated"
  | "subscription_renewed";

export interface NotificationRecord {
  id: string;
  userId: string;
  environment: import("./types").PayPalMode;
  type: NotificationType;
  title: string;
  message?: string;
  href?: string;
  sourceKey: string;
  readAt?: string;
  createdAt: string;
}

export interface CreateNotificationInput {
  environment?: import("./types").PayPalMode;
  type: NotificationType;
  title: string;
  message?: string;
  href?: string;
  sourceKey: string;
}

export interface PayPalSubscriptionNotificationInput {
  userId: string;
  record: FeatureRecord;
  event: PayPalWebhookEvent;
  isNewPayment: boolean;
}

export interface OrderPaymentFailureInput {
  order: Order;
  paypalStatus: string;
}
