export interface CampaignUnsubscribeRouteContext {
  params: Promise<{ campaignId: string; deliveryId: string }>;
}
