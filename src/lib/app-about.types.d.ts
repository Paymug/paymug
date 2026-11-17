export interface AppConfigurationStatus {
  id: string;
  label: string;
  description: string;
  configured: boolean;
  required: boolean;
}

export interface AppAboutStatus {
  version: string;
  configurations: AppConfigurationStatus[];
}

export interface AppUpdateStatus {
  currentVersion: string;
  latestVersion: string;
  isLatest: boolean;
  workflowUrl?: string;
  checkedAt: string;
  configured: boolean;
  configuration: AppUpdateConfigurationItem[];
  repository?: string;
}

export interface AppUpdateConfigurationItem {
  name: "GITHUB_UPDATE_TOKEN" | "GITHUB_UPDATE_REPO";
  configured: boolean;
}

export interface AppUpdateDispatchResult {
  ok: true;
  repository: string;
  ref: string;
  runUrl?: string;
  workflowRunId?: number;
}
