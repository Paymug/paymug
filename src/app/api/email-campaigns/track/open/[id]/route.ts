import { recordEmailCampaignEngagement } from "@/lib/email-campaign-tracking";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  await recordEmailCampaignEngagement(id, "open");
  return Response.redirect(new URL("/favicon.png", req.url), 302);
}
