import type {
  WebhookFormValues,
  WebhookProductOption,
} from "./WebhooksWorkspace.types";

export interface WebhookScopeFieldsProps {
  values: WebhookFormValues;
  productOptions: WebhookProductOption[];
  onChange(values: WebhookFormValues): void;
}
