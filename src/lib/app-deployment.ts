import "server-only";

import packageJson from "../../package.json";
import type { AppDeploymentInfo } from "./app-deployment.types";

export function getAppDeploymentInfo(): AppDeploymentInfo {
  return {
    version: packageJson.version,
  };
}
