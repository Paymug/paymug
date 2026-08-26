export type ProFeature =
  | "email_campaigns"
  | "automations"
  | "affiliates"
  | "pages"
  | "multi_store"
  | "private_github";

export type AppLicenseState =
  | "free"
  | "active"
  | "invalid"
  | "expired"
  | "deactivated";

export interface AppLicenseStatus {
  state: AppLicenseState;
  pro: boolean;
  plan: "free" | "pro";
  features: ProFeature[];
  licenseKeyPrefix?: string;
  instanceId?: string;
  manageUrl?: string;
  expiresAt?: string;
  lastValidatedAt?: string;
  validationError?: string;
}

export interface LicenseAuthorityRequest {
  licenseKey: string;
  instanceId: string;
  instanceUrl: string;
  appVersion: string;
}

export interface LicenseAuthorityResponse {
  valid: boolean;
  state: Exclude<AppLicenseState, "free">;
  plan: "pro";
  features: ProFeature[];
  manageUrl: string;
  expiresAt?: string;
  error?: string;
}

export interface LicenseAuthorityActivation {
  [key: string]: string;
  instanceId: string;
  instanceUrl: string;
  appVersion: string;
  activatedAt: string;
  lastSeenAt: string;
}

export interface AppLicenseApiResponse {
  license: AppLicenseStatus;
  error?: string;
}
