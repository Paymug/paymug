import type { Store } from "@/lib/types";

export interface StoreSettingsFormProps {
  storeId: string;
  initialName: string;
  initialSlug: string;
  initialDomain?: string;
  initialIsPrimary: boolean;
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
  store?: Store;
  error?: string;
}
