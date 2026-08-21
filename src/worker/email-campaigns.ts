import type {
  ScheduledCampaignResult,
  ScheduledCampaignRow,
} from "./email-campaigns.types";

export async function processScheduledEmailCampaigns(
  env: CloudflareEnv,
  now = new Date(),
): Promise<ScheduledCampaignResult> {
  const result = { sent: 0, failed: 0 };
  const campaigns = await env.DB.prepare(
    "SELECT id FROM feature_records WHERE feature = 'campaigns' AND status = 'scheduled' AND json_extract(data, '$.scheduledAt') <= ? ORDER BY json_extract(data, '$.scheduledAt') ASC LIMIT 50",
  ).bind(now.toISOString()).all<ScheduledCampaignRow>();
  for (const campaign of campaigns.results) {
    try {
      const response = await env.WORKER_SELF_REFERENCE.fetch(
        `https://paymug.internal/api/features/campaigns/${campaign.id}/send`,
        {
          method: "POST",
          headers: { "x-paymug-scheduler": env.AUTH_SECRET },
        },
      );
      if (!response.ok) throw new Error(await response.text());
      result.sent += 1;
    } catch (error) {
      console.error("Scheduled campaign failed", campaign.id, error);
      result.failed += 1;
    }
  }
  return result;
}
