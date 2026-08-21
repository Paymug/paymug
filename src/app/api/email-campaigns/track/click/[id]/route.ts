import { recordEmailCampaignEngagement } from "@/lib/email-campaign-tracking";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url || !/^https?:\/\//i.test(url)) return new Response("Invalid link", { status: 400 });
  await recordEmailCampaignEngagement((await params).id, "click");
  return Response.redirect(url, 302);
}
