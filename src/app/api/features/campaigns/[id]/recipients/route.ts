import { getSessionUser } from "@/lib/auth";
import { findFeatureRecord } from "@/lib/feature-records";
import { getEmailCampaignRecipientPreview } from "@/lib/email-campaign-recipients";
import { jsonError } from "@/lib/utils";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const campaign = await findFeatureRecord((await params).id, user.id);
  if (!campaign || campaign.feature !== "campaigns") return jsonError("Not found", 404);
  const preview = await getEmailCampaignRecipientPreview({
    userId: user.id,
    storeId: String(campaign.data.storeId || user.activeStoreId),
    environment: user.environment,
    campaign,
  });
  return Response.json({
    count: preview.recipients.length,
    counts: preview.counts,
    recipients: preview.recipients.slice(0, 100),
  });
}
