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
}
