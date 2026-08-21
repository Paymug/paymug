import type {
  CreatedOutboundWebhook,
  OutboundWebhookDeliveryRecord,
  OutboundWebhookEventName,
  OutboundWebhookRecord,
} from "@/lib/outbound-webhooks.types";

export interface WebhooksResponse extends Partial<CreatedOutboundWebhook> {
  webhooks?: OutboundWebhookRecord[];
  deliveries?: OutboundWebhookDeliveryRecord[];
  error?: string;
}

export interface WebhookFormValues {
  name: string;
  url: string;
  auth: string;
  events: OutboundWebhookEventName[];
}
