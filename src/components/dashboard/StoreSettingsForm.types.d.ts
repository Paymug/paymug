export interface StoreSettingsFormProps {
  storeId: string;
  initialName: string;
  initialDescription: string;
  initialLogoImageUrl?: string;
  initialCoverImageUrl?: string;
  initialEmailFrom?: string;
  initialEmailReplyTo?: string;
  initialCurrency: string;
  initialTransactionFeeType: "fixed" | "percentage";
  initialTransactionFeeValue: number;
}

export type StoreTransactionFeeSelection =
  | "none"
  | "fixed"
  | "percentage";

export interface StoreSettingsResponse {
  error?: string;
}
