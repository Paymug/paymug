import type { FeatureRecord } from "./feature-records.types";
import type { Order, PayPalMode } from "./types";

export type OutboundWebhookEventName =
  | "order_created"
  | "order_refunded"
  | "subscription_created"
  | "subscription_updated"
  | "subscription_cancelled"
  | "subscription_resumed"
  | "subscription_expired"
  | "subscription_payment_success"
  | "subscription_payment_failed"
  | "license_key_created"
  | "license_key_updated"
  | "webhook_test";

export interface OutboundWebhookEventOption {
  name: Exclude<OutboundWebhookEventName, "webhook_test">;
  label: string;
  description: string;
}

export interface OutboundWebhookRecord {
  id: string;
  userId: string;
  storeId: string;
  environment: PayPalMode;
  name: string;
  url: string;
  authConfigured: boolean;
  events: OutboundWebhookEventName[];
  status: "active" | "paused";
  createdAt: string;
  updatedAt: string;
}

export interface OutboundWebhookDeliveryRecord {
  id: string;
  webhookId: string;
  eventName: OutboundWebhookEventName;
  status: "pending" | "success" | "failed";
  requestBody: string;
  responseStatus?: number;
  responseBody?: string;
  error?: string;
  durationMs?: number;
  createdAt: string;
  completedAt?: string;
}

export interface CreateOutboundWebhookInput {
  userId: string;
  storeId: string;
  environment: PayPalMode;
  name: string;
  url: string;
  auth?: string;
  events: OutboundWebhookEventName[];
}

export interface UpdateOutboundWebhookInput {
  name?: string;
  url?: string;
  auth?: string | null;
  events?: OutboundWebhookEventName[];
  status?: "active" | "paused";
}

export interface CreatedOutboundWebhook {
  webhook: OutboundWebhookRecord;
  secret: string;
}

export interface DispatchOutboundWebhookInput {
  userId: string;
  storeId: string;
  environment: PayPalMode;
  eventName: OutboundWebhookEventName;
  data: Order | FeatureRecord | Record<string, unknown>;
}
