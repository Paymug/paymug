import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { campaignDeliveries } from "@/db/schema";
import { findFeatureRecord, updateFeatureRecord } from "./feature-records";
import type { CampaignEngagementKind } from "./email-campaign-tracking.types";

export async function recordEmailCampaignEngagement(
  deliveryId: string,
  kind: CampaignEngagementKind,
): Promise<void> {
  const db = await getDb();
  const delivery = await db.query.campaignDeliveries.findFirst({
    where: eq(campaignDeliveries.id, deliveryId),
  });
  if (!delivery) return;
  await db.update(campaignDeliveries).set(
    kind === "open"
      ? { openedAt: delivery.openedAt || new Date().toISOString() }
      : { clickedAt: delivery.clickedAt || new Date().toISOString() },
  ).where(eq(campaignDeliveries.id, deliveryId));
  const deliveries = await db.query.campaignDeliveries.findMany({
    where: eq(campaignDeliveries.campaignId, delivery.campaignId),
  });
  const campaign = await findFeatureRecord(delivery.campaignId);
  if (!campaign) return;
  await updateFeatureRecord(campaign.id, campaign.userId, {
    data: {
      ...campaign.data,
      openCount: deliveries.filter((item) => item.openedAt).length,
      clickCount: deliveries.filter((item) => item.clickedAt).length,
    },
  });
}
