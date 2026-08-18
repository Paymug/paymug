import { notFound } from "next/navigation";
import { DashboardFeaturePage } from "@/components/dashboard/DashboardFeaturePage";
import { getDashboardFeature } from "@/components/dashboard/dashboard-feature.config";
import { getSessionUser } from "@/lib/auth";
import { getStoreById } from "@/lib/stores";
import type { DashboardFeatureRouteProps } from "./page.types";

export default async function DashboardFeatureRoute({
  params,
}: DashboardFeatureRouteProps) {
  const { featurePath } = await params;
  const featureConfig = getDashboardFeature(featurePath);
  if (!featureConfig) notFound();
  const user = await getSessionUser();
  if (!user) notFound();
  const store = await getStoreById(user.activeStoreId, user.id);
  if (
    (featurePath[0] === "affiliates" && !store?.affiliatesEnabled) ||
    (featurePath[0] === "email" &&
      featurePath[1] === "campaigns" &&
      !store?.emailCampaignsEnabled)
  ) {
    notFound();
  }

  return <DashboardFeaturePage feature={featureConfig} />;
}
