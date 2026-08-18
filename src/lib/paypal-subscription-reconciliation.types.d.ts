import type { FeatureRecord } from "./feature-records.types";
import type { PayPalMode } from "./types";

export interface PayPalSubscriptionTransaction {
  id: string;
  status?: string;
  time?: string;
  amount_with_breakdown?: {
    gross_amount?: {
      value?: string;
      currency_code?: string;
    };
  };
}

export interface ReconcilePayPalSubscriptionInput {
  subscription: FeatureRecord;
}

export interface ReconcilePayPalSubscriptionResult {
  status: string;
  processedPaymentCount: number;
  orderId?: string;
  benefitsProvisionedAt?: string;
}

export interface ReconcilePayPalSubscriptionsForModeInput {
  userId: string;
  mode: PayPalMode;
}

export interface ReconcilePayPalSubscriptionsForModeResult {
  checked: number;
  reconciled: number;
  failed: number;
}
