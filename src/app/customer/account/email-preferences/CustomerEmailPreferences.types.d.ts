import type { CustomerStoreEmailPreferences } from "@/lib/customer-email-preferences.types";

export interface CustomerEmailPreferencesProps {
  initialPreferences: CustomerStoreEmailPreferences[];
}

export interface CustomerEmailPreferencesResponse {
  ok?: boolean;
  error?: string;
}
