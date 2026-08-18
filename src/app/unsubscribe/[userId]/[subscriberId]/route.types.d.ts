export interface UnsubscribeRouteContext {
  params: Promise<{ userId: string; subscriberId: string }>;
}
