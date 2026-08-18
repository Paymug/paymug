import type { PayPalMode } from "./types";

export interface ScheduleCheckoutReminderInput {
  userId: string;
  storeId: string;
  productId: string;
  environment: PayPalMode;
  customerEmail: string;
  customerName?: string;
  productName: string;
  requestUrl: string;
}
