import type { FeatureRecord } from "./feature-records.types";
import type { PayPalMode } from "./types";

export interface CampaignRecipient {
  email: string;
  name?: string;
  subscriberId?: string;
}

export interface CampaignRecipientContext {
  userId: string;
  storeId: string;
  environment: PayPalMode;
  campaign: FeatureRecord;
}

export interface CampaignRecipientPreview {
  recipients: CampaignRecipient[];
  counts: Record<string, number>;
}
