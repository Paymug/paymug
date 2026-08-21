import type {
  OutboundWebhookDeliveryRecord,
  OutboundWebhookEventName,
} from "@/lib/outbound-webhooks.types";
import { outboundWebhookEventOptions } from "@/lib/outbound-webhook-events.config";

export function getWebhookEventLabel(
  eventName: OutboundWebhookEventName,
): string {
  if (eventName === "webhook_test") return "Webhook test";
  return (
    outboundWebhookEventOptions.find((event) => event.name === eventName)
      ?.label || eventName
  );
}

export function getWebhookDeliveryResponse(
  delivery: OutboundWebhookDeliveryRecord,
): string {
  return delivery.responseBody || delivery.error || "No response body";
}
