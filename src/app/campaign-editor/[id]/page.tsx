import { notFound, redirect } from "next/navigation";
import { CampaignEditor } from "@/components/dashboard/CampaignEditor";
import { hasProFeature } from "@/lib/app-license";
import { getSessionUser } from "@/lib/auth";
import { listProductsByUser } from "@/lib/db";
import { findFeatureRecord } from "@/lib/feature-records";
import type { CampaignEditorRouteProps } from "./page.types";

export default async function EditCampaignPage({
  params,
}: CampaignEditorRouteProps) {
  const user = await getSessionUser();
  if (!user) notFound();
  if (!(await hasProFeature("email_campaigns"))) {
    redirect("/dashboard/email/campaigns");
  }

  const { id } = await params;
  const campaign = await findFeatureRecord(id, user.id);
  if (
    !campaign ||
    campaign.feature !== "campaigns" ||
    String(campaign.data.storeId || "") !== user.activeStoreId ||
    campaign.environment !== user.environment
  ) {
    notFound();
  }

  const products = await listProductsByUser(
    user.id,
    user.activeStoreId,
    user.environment,
  );

  return <CampaignEditor campaign={campaign} products={products} />;
}
