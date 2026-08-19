import {
  checkoutReminders,
  customerAccounts,
  featureRecords,
  orders,
  products,
  stores,
} from "@/db/schema";

export type StoreBackupStore = Omit<typeof stores.$inferSelect, "userId">;
export type StoreBackupProduct = Omit<typeof products.$inferSelect, "userId">;
export type StoreBackupOrder = Omit<typeof orders.$inferSelect, "userId">;
export type StoreBackupCheckoutReminder = Omit<
  typeof checkoutReminders.$inferSelect,
  "userId"
>;
export type StoreBackupFeatureRecord = Omit<
  typeof featureRecords.$inferSelect,
  "userId"
>;
export type StoreBackupCustomer = typeof customerAccounts.$inferSelect;

export interface StoreBackupFile {
  format: "paymug-store-backup";
  version: 1;
  appVersion: string;
  exportedAt: string;
  data: {
    stores: StoreBackupStore[];
    products: StoreBackupProduct[];
    orders: StoreBackupOrder[];
    checkoutReminders: StoreBackupCheckoutReminder[];
    featureRecords: StoreBackupFeatureRecord[];
    customers: StoreBackupCustomer[];
  };
}

export interface StoreBackupImportOptions {
  preserveIds: boolean;
}

export interface StoreBackupImportResult {
  preserveIds: boolean;
  stores: number;
  products: number;
  orders: number;
  checkoutReminders: number;
  featureRecords: number;
  customers: number;
  reusedCustomers: number;
}
