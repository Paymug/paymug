export interface StripeWebhookEvent {
  id: string;
  type: string;
  /** Shape depends on `type`; callers cast to the matching Stripe object. */
  data: {
    object: unknown;
  };
}
