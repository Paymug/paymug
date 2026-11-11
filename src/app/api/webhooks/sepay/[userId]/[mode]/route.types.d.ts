export interface SepayWebhookRouteContext {
  params: Promise<{
    userId: string;
    mode: string;
  }>;
}
