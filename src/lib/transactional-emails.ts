import "server-only";

import { findUserById } from "./db";
import { getStoreById } from "./stores";
import { getRuntimeAbsoluteUrl } from "./runtime-env";
import { sendCloudflareEmail } from "./cloudflare-email";
import {
  buildOrderPaymentFailedEmail,
  buildPurchaseConfirmationEmail,
  buildSubscriptionApprovalEmail,
  buildSubscriptionPaymentIssueEmail,
  buildSubscriptionRenewalEmail,
  buildSubscriptionStatusEmail,
} from "./transactional-email-templates";
import type {
  EmailSenderOptions,
  OrderPaymentFailedEmailInput,
  PayPalSubscriptionEventEmailInput,
  PurchaseConfirmationEmailInput,
  SubscriptionApprovalEmailInput,
  SubscriptionStatusEmailInput,
} from "./transactional-email.types";

async function getStoreEmailContext(
  userId: string,
  storeId?: string
): Promise<{ name: string; logo?: string; sender: EmailSenderOptions }> {
  if (storeId) {
    const store = await getStoreById(storeId, userId);
    if (store) {
      return {
        name: store.name,
        logo: store.logoImageUrl,
        sender: {
          name: store.name,
          replyTo: store.emailReplyTo || store.emailFrom,
        },
      };
    }
  }
  const user = await findUserById(userId);
  const fallbackName = user?.storeName || "Paymug";
  return {
    name: fallbackName,
    sender: {
      name: fallbackName,
    },
  };
}

export async function sendPurchaseConfirmationEmail(
  input: PurchaseConfirmationEmailInput
) {
  const store = await getStoreEmailContext(
    input.order.userId,
    input.order.storeId
  );
  const receiptUrl = await getRuntimeAbsoluteUrl(
    `/checkout/success?orderId=${encodeURIComponent(input.order.id)}`,
    input.requestUrl
  );
  return sendCloudflareEmail(
    buildPurchaseConfirmationEmail(
      { ...input, storeLogo: store.logo },
      store.name,
      receiptUrl
    ),
    store.sender
  );
}

export async function sendOrderPaymentFailedEmail(
  input: OrderPaymentFailedEmailInput
) {
  const store = await getStoreEmailContext(
    input.order.userId,
    input.order.storeId
  );
  const retryUrl = await getRuntimeAbsoluteUrl(
    `/buy/${encodeURIComponent(input.order.productId)}`,
    input.requestUrl
  );
  return sendCloudflareEmail(
    buildOrderPaymentFailedEmail(
      { ...input, storeLogo: store.logo },
      store.name,
      retryUrl
    ),
    store.sender
  );
}

export async function sendSubscriptionApprovalEmail(
  input: SubscriptionApprovalEmailInput
) {
  if (
    !input.subscription.subtitle ||
    !input.subscription.data.approvalUrl
  ) {
    return false;
  }
  const store = await getStoreEmailContext(
    input.subscription.userId,
    String(input.subscription.data.storeId || "") || undefined
  );
  return sendCloudflareEmail(
    buildSubscriptionApprovalEmail(
      { ...input, storeLogo: store.logo },
      store.name
    ),
    store.sender
  );
}

export async function sendSubscriptionStatusEmail(
  input: SubscriptionStatusEmailInput
) {
  if (!input.subscription.subtitle) return false;
  const store = await getStoreEmailContext(
    input.subscription.userId,
    String(input.subscription.data.storeId || "") || undefined
  );
  return sendCloudflareEmail(
    buildSubscriptionStatusEmail(
      { ...input, storeLogo: store.logo },
      store.name
    ),
    store.sender
  );
}

export async function sendPayPalSubscriptionEventEmail({
  subscription,
  event,
  isNewPayment,
  previousStatus,
}: PayPalSubscriptionEventEmailInput) {
  if (!subscription.subtitle) return false;
  const store = await getStoreEmailContext(
    subscription.userId,
    String(subscription.data.storeId || "") || undefined
  );

  if (event.event_type === "PAYMENT.SALE.COMPLETED" && isNewPayment) {
    return sendCloudflareEmail(
      buildSubscriptionRenewalEmail(
        subscription,
        store.name,
        Number(event.resource?.amount?.total || 0),
        event.resource?.amount?.currency || "USD",
        event.create_time,
        store.logo
      ),
      store.sender
    );
  }
  if (event.event_type === "BILLING.SUBSCRIPTION.PAYMENT.FAILED") {
    return sendCloudflareEmail(
      buildSubscriptionPaymentIssueEmail(
        subscription,
        store.name,
        "failed",
        store.logo
      ),
      store.sender
    );
  }
  if (event.event_type === "PAYMENT.SALE.REFUNDED") {
    return sendCloudflareEmail(
      buildSubscriptionPaymentIssueEmail(
        subscription,
        store.name,
        "refunded",
        store.logo
      ),
      store.sender
    );
  }
  if (event.event_type === "PAYMENT.SALE.REVERSED") {
    return sendCloudflareEmail(
      buildSubscriptionPaymentIssueEmail(
        subscription,
        store.name,
        "reversed",
        store.logo
      ),
      store.sender
    );
  }

  const status = subscription.status;
  if (
    status !== previousStatus &&
    ["active", "trialing", "cancelled", "suspended", "expired"].includes(status)
  ) {
    return sendSubscriptionStatusEmail({ subscription, status });
  }
  return false;
}
