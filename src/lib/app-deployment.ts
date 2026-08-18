import "server-only";

import packageJson from "../../package.json";
import { paymugBuildInfo } from "@/generated/paymug-build-info";
import { paymugUpdateConfig } from "./app-update.config";
import type { AppDeploymentInfo } from "./app-deployment.types";

export function getAppDeploymentInfo(): AppDeploymentInfo {
  const commitSha = paymugBuildInfo.commitSha || "";
  const releaseSha = paymugBuildInfo.upstreamSha || commitSha;
  return {
    version: packageJson.version,
    repository: paymugUpdateConfig.upstreamRepository,
    commitSha,
    releaseSha,
    commitUrl: releaseSha
      ? `https://github.com/${paymugUpdateConfig.upstreamRepository}/commit/${releaseSha}`
      : undefined,
  };
}
