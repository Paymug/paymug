export interface StripeWebhookRouteContext {
  params: Promise<{
    userId: string;
    mode: string;
  }>;
}
