import type { FeatureRecord } from "./feature-records.types";
import type {
  Product,
  ProductLicenseType,
  ProductLicenseUpdatePeriodUnit,
} from "./types";

export type LicenseProductSettings = Pick<
  Product,
  | "billingType"
  | "generateLicense"
  | "licenseType"
  | "licenseUpdatePeriodUnit"
  | "licenseUpdatePeriodCount"
>;

export interface LicenseUpdatePeriod {
  unit: ProductLicenseUpdatePeriodUnit;
  count: number;
}

export interface LicenseEntitlementSummary {
  type: ProductLicenseType;
  perpetual: boolean;
  usageActive: boolean;
  updatesExpireAt?: string;
  updatesActive: boolean;
}

export type LicenseRecord = Pick<
  FeatureRecord,
  "status" | "data"
>;
