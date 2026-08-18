import type { StripeCheckoutSession } from "./stripe.types";

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: StripeCheckoutSession;
  };
}
