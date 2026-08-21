import type { CustomerStoreEmailPreferences } from "@/lib/customer-email-preferences.types";

export function dedupeCustomerStoreEmailPreferences(
  preferences: CustomerStoreEmailPreferences[],
): CustomerStoreEmailPreferences[] {
  return [
    ...new Map(
      preferences.map((preference) => [preference.storeId, preference]),
    ).values(),
  ];
}
