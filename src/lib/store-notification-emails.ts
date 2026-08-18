import "server-only";

import { sendCloudflareEmail } from "./cloudflare-email";
import { findUserById } from "./db";
import {
  buildStoreAffiliateRegisteredEmail,
  buildStoreOrderPaymentEmail,
  buildStoreSubscriptionPaymentEmail,
} from "./store-notification-email-templates";
import { getStoreById } from "./stores";
import type {
  StoreAffiliateRegisteredEmailInput,
  StoreNotificationEmailContext,
  StoreOrderPaymentEmailInput,
  StoreSubscriptionPaymentEmailInput,
} from "./store-notification-emails.types";

async function getStoreNotificationEmailContext(
  userId: string,
  storeId?: string,
): Promise<StoreNotificationEmailContext | undefined> {
  const [user, store] = await Promise.all([
    findUserById(userId),
    storeId ? getStoreById(storeId, userId) : undefined,
  ]);
  if (!user) return undefined;
  return {
    name: store?.name || user.storeName,
    logo: store?.logoImageUrl,
    recipient: user.email,
    sender: store
      ? {
          name: store.name,
          replyTo: store.emailReplyTo || store.emailFrom,
        }
      : {
          name: user.storeName,
        },
  };
}

export async function sendStoreOrderPaymentEmail(
  input: StoreOrderPaymentEmailInput,
) {
  try {
    const context = await getStoreNotificationEmailContext(
      input.order.userId,
      input.order.storeId,
    );
    if (!context) return false;
    return sendCloudflareEmail(
      buildStoreOrderPaymentEmail(
        input,
        context.name,
        context.recipient,
        context.logo,
      ),
      context.sender,
    );
  } catch (error) {
    console.error("Store order payment email failed", error);
    return false;
  }
}

export async function sendStoreSubscriptionPaymentEmail(
  input: StoreSubscriptionPaymentEmailInput,
) {
  try {
    const context = await getStoreNotificationEmailContext(
      input.subscription.userId,
      String(input.subscription.data.storeId || "") || undefined,
    );
    if (!context) return false;
    return sendCloudflareEmail(
      buildStoreSubscriptionPaymentEmail(
        input,
        context.name,
        context.recipient,
        context.logo,
      ),
      context.sender,
    );
  } catch (error) {
    console.error("Store subscription payment email failed", error);
    return false;
  }
}

export async function sendStoreAffiliateRegisteredEmail(
  input: StoreAffiliateRegisteredEmailInput,
) {
  try {
    const context = await getStoreNotificationEmailContext(
      input.userId,
      input.storeId,
    );
    if (!context) return false;
    return sendCloudflareEmail(
      buildStoreAffiliateRegisteredEmail(
        input,
        context.name,
        context.recipient,
        context.logo,
      ),
      context.sender,
    );
  } catch (error) {
    console.error("Store affiliate registration email failed", error);
    return false;
  }
}
