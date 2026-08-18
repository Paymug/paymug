import type { FeatureRecord } from "./feature-records.types";

export interface AppliedDiscount {
  record: FeatureRecord;
  code: string;
  amount: number;
  subscriptionPeriods?: number;
}

export interface CompleteCommerceFeaturesOptions {
  provisionBenefits?: boolean;
  recordDiscount?: boolean;
  recordAffiliate?: boolean;
}
