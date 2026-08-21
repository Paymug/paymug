import type { FeatureRecord } from "@/lib/feature-records.types";
import type { Product } from "@/lib/types";

export interface CampaignEditorProps {
  campaign: FeatureRecord;
  products: Product[];
}

export type SendTiming = "now" | "later";
export type CampaignEmailType =
  | "marketing"
  | "product_updates"
  | "affiliate_updates";

export interface CampaignResponse {
  error?: string;
}

export interface CampaignRecipientsResponse extends CampaignResponse {
  count?: number;
  counts?: Record<string, number>;
  recipients?: Array<{ email: string }>;
}
