import type { FeatureRecord } from "./feature-records.types";
import type { Store } from "./types";

export interface AffiliateApplicationEmailInput {
  store: Store;
  affiliate: FeatureRecord;
}
