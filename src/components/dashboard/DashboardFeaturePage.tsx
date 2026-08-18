import { ApiKeysWorkspace } from "./ApiKeysWorkspace";
import { FeatureWorkspace } from "./FeatureWorkspace";
import { dashboardPageClass, dashboardPageCopyClass } from "./dashboard.styles";
import type { DashboardFeaturePageProps } from "./DashboardFeaturePage.types";

export function DashboardFeaturePage({
  feature,
}: DashboardFeaturePageProps) {
  return (
    <div className={dashboardPageClass}>
      <h1 className="sr-only">{feature.title}</h1>
      <p className={dashboardPageCopyClass}>{feature.description}</p>

      {feature.key === "api-keys" ? (
        <ApiKeysWorkspace />
      ) : (
        <FeatureWorkspace feature={feature} />
      )}
    </div>
  );
}
