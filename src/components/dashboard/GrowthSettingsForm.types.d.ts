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
  initialAnalyticsEnabled: boolean;
  initialDisplayPurchasesEnabled: boolean;
  initialAbandonmentPopupEnabled: boolean;
  initialAbandonmentQuestion: string;
  initialAbandonmentOptions: string[];
  affiliatesUnlocked: boolean;
  emailCampaignsUnlocked: boolean;
}

export interface GrowthSettingsResponse {
  error?: string;
}
