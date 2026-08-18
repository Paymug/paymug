export type DashboardFeatureKey =
  | "subscriptions"
  | "customers"
  | "discounts"
  | "licenses"
  | "campaigns"
  | "subscribers"
  | "affiliates"
  | "affiliate-clicks"
  | "affiliate-referrals"
  | "affiliate-payouts"
  | "pages";

export type FeatureRecordValue =
  | string
  | number
  | boolean
  | null
  | FeatureRecordValue[]
  | { [key: string]: FeatureRecordValue };

export interface FeatureRecord {
  id: string;
  userId: string;
  environment: import("./types").PayPalMode;
  feature: DashboardFeatureKey;
  title: string;
  subtitle?: string;
  status: string;
  data: Record<string, FeatureRecordValue>;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureRecordInput {
  environment?: import("./types").PayPalMode;
  title: string;
  subtitle?: string;
  status?: string;
  data?: Record<string, FeatureRecordValue>;
  createdAt?: string;
}

export interface ApiKeyRecord {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  lastUsedAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  createdAt: string;
}

export interface CreatedApiKey {
  record: ApiKeyRecord;
  secret: string;
}
