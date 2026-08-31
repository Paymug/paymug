import type { PayPalMode } from "./types";
import type { CheckoutCustomData } from "./checkout-custom-data.types";

export interface ScheduleCheckoutReminderInput {
  userId: string;
  storeId: string;
  productId: string;
  productSlug: string;
  environment: PayPalMode;
  customerEmail: string;
  customerName?: string;
  productName: string;
  requestUrl: string;
  customAmount?: string;
  custom?: CheckoutCustomData;
}
