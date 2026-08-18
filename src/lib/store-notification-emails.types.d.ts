import type { FeatureRecord } from "./feature-records.types";
import type { PayPalWebhookEvent } from "./paypal-webhooks.types";
import type { Order } from "./types";

export interface StoreNotificationEmailContext {
  name: string;
  logo?: string;
  recipient: string;
  sender: {
    name?: string;
    replyTo?: string;
  };
}

export interface StoreOrderPaymentEmailInput {
  order: Order;
}

export interface StoreSubscriptionPaymentEmailInput {
  subscription: FeatureRecord;
  event: PayPalWebhookEvent;
  isRenewal: boolean;
}

export interface StoreAffiliateRegisteredEmailInput {
  userId: string;
  storeId: string;
  affiliate: FeatureRecord;
}
