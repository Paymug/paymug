import "server-only";

import packageJson from "../../package.json";
import { paymugBuildInfo } from "@/generated/paymug-build-info";
import { paymugUpdateConfig } from "./app-update.config";
import type { AppDeploymentInfo } from "./app-deployment.types";
import type { AppUpdateStatus } from "./app-about.types";

export async function checkForAppUpdate(): Promise<AppUpdateStatus> {
  const response = await fetch(paymugUpdateConfig.deploymentsUrl, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Could not check the latest Paymug deployment.");
  }
  const deployment = (await response.json()) as Partial<AppDeploymentInfo>;
  if (!deployment.version || typeof deployment.version !== "string") {
    throw new Error("The Paymug deployment API returned invalid version data.");
  }
  return {
    currentVersion: packageJson.version,
    latestVersion: deployment.version,
    isLatest: deployment.version === packageJson.version,
    workflowUrl: paymugBuildInfo.repository
      ? `https://github.com/${paymugBuildInfo.repository}/actions/workflows/sync-upstream.yml`
      : undefined,
    checkedAt: new Date().toISOString(),
  };
}
