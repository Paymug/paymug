import "server-only";

import packageJson from "../../package.json";
import { paymugBuildInfo } from "@/generated/paymug-build-info";
import { paymugUpdateConfig } from "./app-update.config";
import type { AppDeploymentInfo } from "./app-deployment.types";
import type { AppUpdateStatus } from "./app-about.types";

export async function checkForAppUpdate(): Promise<AppUpdateStatus> {
  const repository = paymugUpdateConfig.upstreamRepository;
  const currentSha = paymugBuildInfo.upstreamSha;
  if (!currentSha) {
    throw new Error(
      "This deployment does not contain update metadata. Run one deployment from the generated repository first.",
    );
  }

  const response = await fetch(paymugUpdateConfig.deploymentsUrl, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Could not check the latest Paymug deployment.");
  }
  const deployment = (await response.json()) as Partial<AppDeploymentInfo>;
  if (!deployment.releaseSha || !/^[a-f0-9]{40}$/i.test(deployment.releaseSha)) {
    throw new Error("The Paymug deployment API returned invalid release data.");
  }
  return {
    currentVersion: packageJson.version,
    latestVersion: deployment.version || packageJson.version,
    currentSha,
    latestSha: deployment.releaseSha,
    repository,
    updateAvailable: deployment.releaseSha !== currentSha,
    latestCommitUrl: deployment.commitUrl,
    workflowUrl: paymugBuildInfo.repository
      ? `https://github.com/${paymugBuildInfo.repository}/actions/workflows/sync-upstream.yml`
      : undefined,
    checkedAt: new Date().toISOString(),
  };
}
