import type { OutboundWebhookRecord } from "@/lib/outbound-webhooks.types";
import type { WebhookProductOption } from "./WebhooksWorkspace.types";

export interface EditWebhookFormProps {
  webhook: OutboundWebhookRecord;
  productOptions: WebhookProductOption[];
}
