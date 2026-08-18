import type { PayPalMode, ProductIntervalUnit } from "./types";

export interface PayPalSubscriptionProvisionInput {
  userId: string;
  storeId?: string;
  mode: PayPalMode;
  recordId: string;
  planName: string;
  customerEmail: string;
  /** Amount in major currency units (e.g. 9.99). */
  amount: number;
  /** Optional discounted amount for the first introductory billing periods. */
  introductoryAmount?: number;
  introductoryPeriodCount?: number;
  currency?: string;
  /** @deprecated Prefer intervalUnit + intervalCount. */
  interval?: "monthly" | "yearly" | "weekly";
  intervalUnit?: ProductIntervalUnit;
  intervalCount?: number;
  trialDays: number;
  requestUrl: string;
}

export interface PayPalSubscriptionProvisionResult {
  paypalProductId: string;
  paypalPlanId: string;
  paypalSubscriptionId: string;
  approvalUrl: string;
}
