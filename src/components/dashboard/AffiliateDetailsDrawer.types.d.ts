import type { FeatureRecord } from "@/lib/feature-records.types";

export interface AffiliateDetailsDrawerProps {
  affiliate: FeatureRecord;
  onClose(): void;
  onUpdated(affiliate: FeatureRecord): void;
}

export interface AffiliateDetailsResponse {
  record?: FeatureRecord;
  error?: string;
}
