import { DashboardFeaturePage } from "@/components/dashboard/DashboardFeaturePage";
import { getNestedDashboardFeature } from "@/components/dashboard/dashboard-feature.config";

export default function ApiKeysPage() {
  const feature = getNestedDashboardFeature("settings", "api-keys");
  if (!feature) return null;
  return <DashboardFeaturePage feature={feature} />;
}
