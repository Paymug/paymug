import type { FeatureRecord } from "./feature-records.types";
import type { PayPalMode, Product } from "./types";

export interface CreatePendingSubscriptionOrderInput {
  orderId: string;
  product: Product;
  amount: number;
  customerEmail: string;
  customerName?: string;
  discountCode?: string;
  discountAmount: number;
  transactionFeeAmount: number;
  affiliateId?: string;
  environment: PayPalMode;
  paypalSubscriptionId: string;
  githubUsername?: string;
}

export interface RecordSubscriptionPaymentOrderInput {
  subscription: FeatureRecord;
  paymentId: string;
  paidAt: string;
  amount: number;
  currency?: string;
  isRenewal: boolean;
  paymentNumber?: number;
  provisionBenefits: boolean;
}

export interface ActivateSubscriptionTrialOrderInput {
  subscription: FeatureRecord;
  activatedAt: string;
}
