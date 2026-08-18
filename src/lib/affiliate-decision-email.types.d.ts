import type { FeatureRecord } from "./feature-records.types";
import type { Store } from "./types";

export interface AffiliateDecisionEmailInput {
  store: Store;
  affiliate: FeatureRecord;
  decision: "approved" | "rejected";
  message?: string;
  portalUrl?: string;
}
