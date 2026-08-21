import type {
  OutboundWebhookEventName,
  OutboundWebhookEventOption,
} from "./outbound-webhooks.types";

export const outboundWebhookEventOptions: OutboundWebhookEventOption[] = [
  {
    name: "order_created",
    label: "Order created",
    description: "A checkout is paid and an order is created.",
  },
  {
    name: "order_refunded",
    label: "Order refunded",
    description: "A paid order is refunded or reversed.",
  },
  {
    name: "subscription_created",
    label: "Subscription created",
    description: "A new subscription is created.",
  },
  {
    name: "subscription_updated",
    label: "Subscription updated",
    description: "Subscription details or state change.",
  },
  {
    name: "subscription_cancelled",
    label: "Subscription cancelled",
    description: "A subscription is cancelled.",
  },
  {
    name: "subscription_resumed",
    label: "Subscription resumed",
    description: "A paused or suspended subscription becomes active.",
  },
  {
    name: "subscription_expired",
    label: "Subscription expired",
    description: "A subscription reaches its end date.",
  },
  {
    name: "subscription_payment_success",
    label: "Subscription payment success",
    description: "A recurring subscription payment succeeds.",
  },
  {
    name: "subscription_payment_failed",
    label: "Subscription payment failed",
    description: "A recurring subscription payment fails.",
  },
  {
    name: "license_key_created",
    label: "License key created",
    description: "A product license key is issued.",
  },
  {
    name: "license_key_updated",
    label: "License key updated",
    description: "A product license key or entitlement changes.",
  },
];

export const outboundWebhookEventNames = new Set<OutboundWebhookEventName>([
  ...outboundWebhookEventOptions.map((event) => event.name),
  "webhook_test",
]);
