import type { PayPalMode } from "./types";

export interface PayPalWebhookSetupInput {
  userId: string;
  mode: PayPalMode;
  clientId: string;
  clientSecret: string;
  requestUrl: string;
  webhookOrigin?: string;
  webhookId?: string;
}

export interface PayPalWebhookSetupResult {
  webhookId?: string;
  webhookUrl: string;
  webhookStatus: "active" | "manual_required" | "error";
  webhookError?: string;
  /** Event types registered (or intended) on the PayPal webhook. */
  eventTypes?: string[];
}

export interface PayPalWebhookConfiguration {
  id: string;
  url: string;
}

export interface PayPalWebhookDeleteInput {
  mode: PayPalMode;
  clientId: string;
  clientSecret: string;
  webhookId: string;
}

export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  create_time?: string;
  resource?: {
    id?: string;
    status?: string;
    state?: string;
    billing_agreement_id?: string;
    supplementary_data?: {
      related_ids?: {
        subscription_id?: string;
        capture_id?: string;
        order_id?: string;
      };
    };
    amount?: {
      total?: string;
      currency?: string;
    };
  };
}

export interface PayPalWebhookRouteInput {
  userId: string;
  mode: PayPalMode;
  headers: Headers;
  event: PayPalWebhookEvent;
}
