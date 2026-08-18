import type { PayPalMode } from "./types";

export interface PayPalPayoutInput {
  userId: string;
  storeId?: string;
  mode: PayPalMode;
  recordId: string;
  recipientEmail: string;
  amount: number;
  note?: string;
}

export interface PayPalPayoutResult {
  payoutBatchId: string;
  payoutStatus: string;
}
