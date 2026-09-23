import type { ReactNode } from "react";
import type { Store } from "@/lib/types";

export interface StoreSettingsFormProps {
  storeId: string;
  /** Rendered under the store preview (for example the storefront product layout). */
  previewContent?: ReactNode;
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
