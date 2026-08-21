import { getSessionUser } from "@/lib/auth";
import { sendEmailCampaign } from "@/lib/email-campaigns";
import { jsonError } from "@/lib/utils";
import type { CampaignSendRouteContext } from "./route.types";
import { requireProFeature } from "@/lib/pro-feature-access";
import { getRequiredRuntimeEnvValue } from "@/lib/runtime-env";
import { getDb } from "@/db";
import { featureRecords } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: CampaignSendRouteContext
) {
  const { id } = await params;
  const schedulerToken = req.headers.get("x-paymug-scheduler");
  const scheduled =
    schedulerToken &&
    schedulerToken === (await getRequiredRuntimeEnvValue("AUTH_SECRET"));
  const user = scheduled ? null : await getSessionUser();
  if (!scheduled && !user) return jsonError("Unauthorized", 401);
  if (!scheduled) {
    const denied = await requireProFeature("email_campaigns");
    if (denied) return denied;
  }
  try {
    const scheduledCampaign = scheduled
      ? await (await getDb()).query.featureRecords.findFirst({
          where: eq(featureRecords.id, id),
        })
      : undefined;
    const userId = user?.id || scheduledCampaign?.userId;
    if (!userId) return jsonError("Campaign not found", 404);
    return Response.json({
      result: await sendEmailCampaign(
        userId,
        id,
        req.url,
        user?.activeStoreId,
        user?.environment || scheduledCampaign?.environment,
      ),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not send campaign",
      400
    );
  }
}
