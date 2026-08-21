import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { sendEmailCampaignTest } from "@/lib/email-campaigns";
import { jsonError } from "@/lib/utils";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = z.object({ email: z.string().email() }).safeParse(await req.json());
  if (!parsed.success) return jsonError("Enter a valid test email");
  try {
    await sendEmailCampaignTest(user.id, (await params).id, req.url, parsed.data);
    return Response.json({ sent: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not send test", 400);
  }
}
