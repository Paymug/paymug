export type CustomerEmailPreferenceCategory =
  | "marketing"
  | "product_updates"
  | "affiliate_updates";

export interface CustomerEmailPreferenceValues {
  marketingEnabled: boolean;
  productUpdatesEnabled: boolean;
  affiliateUpdatesEnabled: boolean;
}

export interface CustomerStoreEmailPreferences
  extends CustomerEmailPreferenceValues {
  storeId: string;
  storeName: string;
  storeLogoImageUrl?: string;
}

export interface CustomerEmailPreferencesUpdate {
  storeId: string;
  marketingEnabled: boolean;
  productUpdatesEnabled: boolean;
  affiliateUpdatesEnabled: boolean;
}
