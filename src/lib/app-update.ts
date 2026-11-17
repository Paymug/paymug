import "server-only";

import packageJson from "../../package.json";
import { paymugBuildInfo } from "@/generated/paymug-build-info";
import { paymugUpdateConfig } from "./app-update.config";
import { getRuntimeConfiguration } from "./runtime-env";
import type { AppDeploymentInfo } from "./app-deployment.types";
import type {
  AppUpdateConfigurationItem,
  AppUpdateDispatchResult,
  AppUpdateStatus,
} from "./app-about.types";

interface GitHubErrorBody {
  message?: string;
  default_branch?: string;
  workflow_run_id?: number;
  html_url?: string;
}

export class AppUpdateConfigError extends Error {}

function parseVersion(version: string): number[] {
  const parts = version.trim().replace(/^v/, "").split("-")[0].split(".");
  if (parts.length < 1 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) {
    throw new Error(`Invalid application version: ${version}`);
  }
  return [0, 1, 2].map((i) => Number(parts[i] ?? 0));
}

export function isNewerVersion(target: string, current: string): boolean {
  const a = parseVersion(target);
  const b = parseVersion(current);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

async function getUpdateSettings() {
  const { values } = await getRuntimeConfiguration();
  const token = values.GITHUB_UPDATE_TOKEN;
  const repository = values.GITHUB_UPDATE_REPO || paymugBuildInfo.repository;
  const configuration: AppUpdateConfigurationItem[] = [
    { name: "GITHUB_UPDATE_TOKEN", configured: Boolean(token) },
    { name: "GITHUB_UPDATE_REPO", configured: Boolean(repository) },
  ];
  return {
    token,
    repository,
    ref: values.GITHUB_UPDATE_REF,
    configuration,
    configured: configuration.every((item) => item.configured),
  };
}

async function githubRequest(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<{ response: Response; data: GitHubErrorBody }> {
  const response = await fetch(`${paymugUpdateConfig.githubApiUrl}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "paymug",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": paymugUpdateConfig.githubApiVersion,
    },
  });
  const text = response.status === 204 ? "" : await response.text();
  let data: GitHubErrorBody = {};
  try {
    data = text ? (JSON.parse(text) as GitHubErrorBody) : {};
  } catch {
    data = {};
  }
  return { response, data };
}

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
  const settings = await getUpdateSettings();
  return {
    currentVersion: packageJson.version,
    latestVersion: deployment.version,
    isLatest: !isNewerVersion(deployment.version, packageJson.version),
    configured: settings.configured,
    configuration: settings.configuration,
    repository: settings.repository || undefined,
    workflowUrl: settings.repository
      ? `https://github.com/${settings.repository}/actions/workflows/${paymugUpdateConfig.workflowFile}`
      : undefined,
    checkedAt: new Date().toISOString(),
  };
}

export async function dispatchAppUpdate(): Promise<AppUpdateDispatchResult> {
  const { token, repository, ref: configuredRef, configured } =
    await getUpdateSettings();
  if (!configured || !token || !repository) {
    throw new AppUpdateConfigError(
      "GITHUB_UPDATE_TOKEN and GITHUB_UPDATE_REPO must be configured.",
    );
  }

  let ref = configuredRef;
  if (!ref) {
    const repo = await githubRequest(`/repos/${repository}`, token);
    if (!repo.response.ok || !repo.data.default_branch) {
      throw new Error(
        repo.data.message || "Could not determine the repository default branch.",
      );
    }
    ref = repo.data.default_branch;
  }

  const { response, data } = await githubRequest(
    `/repos/${repository}/actions/workflows/${paymugUpdateConfig.workflowFile}/dispatches`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ ref, return_run_details: true }),
    },
  );
  if (!response.ok) {
    throw new Error(
      data.message ||
        `GitHub returned HTTP ${response.status} dispatching ${paymugUpdateConfig.workflowFile} in ${repository}.`,
    );
  }
  return {
    ok: true,
    repository,
    ref,
    runUrl: data.html_url,
    workflowRunId: data.workflow_run_id,
  };
}
