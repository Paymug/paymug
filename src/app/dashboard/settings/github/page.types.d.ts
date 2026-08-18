export interface GitHubSettingsPageProps {
  searchParams: Promise<{
    connected?: string;
    disconnected?: string;
    error?: string;
  }>;
}

export interface GitHubOAuthConfigStatus {
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  encryptionConfigured: boolean;
  ready: boolean;
}

export type GitHubOAuthRuntimeConfig = GitHubOAuthConfigStatus;

export interface GitHubCallbackSettingsFormProps {
  initialHostname: string;
  requestUrl: string;
}

export interface GitHubCallbackSettingsResponse {
  hostname?: string;
  callbackUrl?: string;
  error?: string;
}
