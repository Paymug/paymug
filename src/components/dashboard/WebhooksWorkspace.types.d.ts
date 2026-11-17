import type {
  OutboundWebhookDeliveryRecord,
  OutboundWebhookEventName,
  OutboundWebhookRecord,
} from "@/lib/outbound-webhooks.types";

export interface WebhooksResponse {
  sent?: boolean;
  webhook?: OutboundWebhookRecord;
  webhooks?: OutboundWebhookRecord[];
  deliveries?: OutboundWebhookDeliveryRecord[];
  error?: string;
}

export interface WebhookFormValues {
  name: string;
  url: string;
  auth: string;
  allProducts: boolean;
  productIds: string[];
  allEvents: boolean;
  events: Exclude<OutboundWebhookEventName, "webhook_test">[];
}

export interface WebhookProductOption {
  label: string;
  value: string;
}
