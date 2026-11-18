import type { PayPalMode } from "./types";

export type SubscriptionCancelSource = "customer" | "api" | "mcp";

export interface CancelSubscriptionInput {
  id: string;
  userId: string;
  environment: PayPalMode;
  source: SubscriptionCancelSource;
  requestUrl?: string;
}
