export interface CreateStoreInput {
  userId: string;
  name: string;
  description?: string;
  logoImageUrl?: string;
  coverImageUrl?: string;
}

export interface UpdateStoreInput {
  name?: string;
  slug?: string;
  description?: string;
  logoImageUrl?: string | null;
  coverImageUrl?: string | null;
  emailFrom?: string | null;
  emailReplyTo?: string | null;
  paymentGateway?: "paypal" | "stripe";
  affiliatesEnabled?: boolean;
  affiliateCommissionType?: "percentage" | "fixed";
  affiliateCommissionValue?: number;
  affiliateCommissionDuration?: "one_time" | "recurring";
  affiliateAttributionModel?: "first_click" | "last_click";
  emailCampaignsEnabled?: boolean;
  abandonedCheckoutRemindersEnabled?: boolean;
  currency?: string;
  transactionFeeType?: "fixed" | "percentage";
  transactionFeeValue?: number;
}

export type StoreCredentialKind = "payment" | "github";
