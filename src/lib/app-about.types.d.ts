export interface AppConfigurationStatus {
  id: string;
  label: string;
  description: string;
  configured: boolean;
  required: boolean;
}

export interface AppAboutStatus {
  version: string;
  commitSha?: string;
  upstreamSha?: string;
  repository?: string;
  configurations: AppConfigurationStatus[];
}

export interface AppUpdateStatus {
  currentVersion: string;
  latestVersion: string;
  currentSha: string;
  latestSha: string;
  repository: string;
  updateAvailable: boolean;
  latestCommitUrl?: string;
  workflowUrl?: string;
  checkedAt: string;
}
