import type {
  AffiliateAttributionModel,
  AffiliateCommissionDuration,
  AffiliateCommissionType,
} from "@/lib/types";

export interface GrowthSettingsFormProps {
  storeId: string;
  initialAffiliatesEnabled: boolean;
  initialAffiliateCommissionType: AffiliateCommissionType;
  initialAffiliateCommissionValue: number;
  initialAffiliateCommissionDuration: AffiliateCommissionDuration;
  initialAffiliateAttributionModel: AffiliateAttributionModel;
  initialEmailCampaignsEnabled: boolean;
}

export interface GrowthSettingsResponse {
  error?: string;
}
