import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { campaignDeliveries } from "@/db/schema";
import {
  disableCustomerEmailCategory,
  normalizeCustomerEmailPreferenceCategory,
} from "@/lib/customer-email-preferences";
import { findFeatureRecord } from "@/lib/feature-records";
import { getRuntimeAbsoluteUrl } from "@/lib/runtime-env";
import { getStoreById } from "@/lib/stores";
import { escapeEmailHtml } from "@/lib/transactional-email.utils";
import type { CampaignUnsubscribeRouteContext } from "./route.types";

async function unsubscribeFromCampaign(
  request: Request,
  context: CampaignUnsubscribeRouteContext,
) {
  const { campaignId, deliveryId } = await context.params;
  const db = await getDb();
  const delivery = await db.query.campaignDeliveries.findFirst({
    where: and(
      eq(campaignDeliveries.id, deliveryId),
      eq(campaignDeliveries.campaignId, campaignId),
    ),
  });
  const campaign = delivery
    ? await findFeatureRecord(campaignId)
    : undefined;
  const storeId = String(campaign?.data.storeId || "");
  if (!delivery || !campaign || campaign.feature !== "campaigns" || !storeId) {
    return new Response("Campaign subscription not found", { status: 404 });
  }

  const category = normalizeCustomerEmailPreferenceCategory(
    campaign.data.emailType,
  );
  await disableCustomerEmailCategory(delivery.email, storeId, category);
  const store = await getStoreById(storeId, campaign.userId);
  const preferencesUrl = await getRuntimeAbsoluteUrl(
    "/customer/account/email-preferences",
    request.url,
  );
  return new Response(
    `<!doctype html><html><body style="margin:0;background:#f6f6f8;font-family:system-ui;color:#27272f"><main style="max-width:520px;margin:64px auto;padding:32px;border:1px solid #e8e8ee;border-radius:16px;background:white;text-align:center"><h1 style="margin-top:0">You’re unsubscribed</h1><p>You will no longer receive this type of email from ${escapeEmailHtml(store?.name || "this store")}.</p><a href="${escapeEmailHtml(preferencesUrl)}" style="color:#7a5c00">Manage Preferences</a></main></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(
  request: Request,
  context: CampaignUnsubscribeRouteContext,
) {
  return unsubscribeFromCampaign(request, context);
}

export async function POST(
  request: Request,
  context: CampaignUnsubscribeRouteContext,
) {
  return unsubscribeFromCampaign(request, context);
}
