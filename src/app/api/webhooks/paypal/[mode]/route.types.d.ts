export interface PayPalWebhookRouteContext {
  params: Promise<{
    mode: string;
  }>;
}
