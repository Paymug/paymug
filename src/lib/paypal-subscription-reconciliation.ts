import "server-only";

import {
  listFeatureRecords,
  updateFeatureRecord,
} from "./feature-records";
import { getPayPalAccessToken, paypalBaseUrl } from "./paypal";
import { getPayPalCredentials } from "./payment-credentials";
import {
  ensurePendingSubscriptionOrder,
  recordSubscriptionPaymentOrder,
} from "./subscription-orders";
import { uid } from "./utils";
import type {
  PayPalSubscriptionTransaction,
  ReconcilePayPalSubscriptionInput,
  ReconcilePayPalSubscriptionResult,
  ReconcilePayPalSubscriptionsForModeInput,
  ReconcilePayPalSubscriptionsForModeResult,
} from "./paypal-subscription-reconciliation.types";

async function readPayPalSubscriptionResponse<T>(
  url: string,
  accessToken: string
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(
      `PayPal subscription reconciliation failed (${response.status}): ${await response.text()}`
    );
  }
  return (await response.json()) as T;
}

function getTransactionWindowStart(createdAt: string): string {
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) {
    parsed.setTime(Date.now() - 24 * 60 * 60 * 1000);
  } else {
    parsed.setMinutes(parsed.getMinutes() - 5);
  }
  return parsed.toISOString();
}

export async function reconcilePayPalSubscription(
  input: ReconcilePayPalSubscriptionInput
): Promise<ReconcilePayPalSubscriptionResult> {
  let { subscription } = input;
  if (
    subscription.data.source === "product_checkout" &&
    typeof subscription.data.productId === "string" &&
    typeof subscription.data.orderId !== "string"
  ) {
    subscription =
      (await updateFeatureRecord(subscription.id, subscription.userId, {
        data: {
          ...subscription.data,
          orderId: uid(),
          environment: subscription.environment,
        },
      })) || subscription;
  }
  await ensurePendingSubscriptionOrder(subscription);

  const subscriptionId =
    typeof subscription.data.paypalSubscriptionId === "string"
      ? subscription.data.paypalSubscriptionId
      : undefined;
  if (!subscriptionId) {
    return {
      status: subscription.status,
      processedPaymentCount: 0,
      orderId:
        typeof subscription.data.orderId === "string"
          ? subscription.data.orderId
          : undefined,
    };
  }
  const mode = subscription.environment;
  const storeId =
    typeof subscription.data.storeId === "string"
      ? subscription.data.storeId
      : undefined;
  const connection = await getPayPalCredentials(
    subscription.userId,
    mode,
    storeId
  );
  if (!connection) {
    throw new Error(`PayPal ${mode} credentials are not configured`);
  }
  const accessToken = await getPayPalAccessToken(
    connection.clientId,
    connection.clientSecret,
    mode
  );
  const encodedSubscriptionId = encodeURIComponent(subscriptionId);
  const baseUrl = paypalBaseUrl(mode);
  const details = await readPayPalSubscriptionResponse<{ status?: string }>(
    `${baseUrl}/v1/billing/subscriptions/${encodedSubscriptionId}`,
    accessToken
  );
  const query = new URLSearchParams({
    start_time: getTransactionWindowStart(subscription.createdAt),
    end_time: new Date().toISOString(),
  });
  const transactionList = await readPayPalSubscriptionResponse<{
    transactions?: PayPalSubscriptionTransaction[];
  }>(
    `${baseUrl}/v1/billing/subscriptions/${encodedSubscriptionId}/transactions?${query.toString()}`,
    accessToken
  );
  const completedTransactions = (transactionList.transactions || [])
    .filter(
      (transaction) =>
        transaction.id && transaction.status?.toUpperCase() === "COMPLETED"
    )
    .sort((left, right) =>
      String(left.time || "").localeCompare(String(right.time || ""))
    );
  let benefitsProvisionedAt =
    typeof subscription.data.benefitsProvisionedAt === "string"
      ? subscription.data.benefitsProvisionedAt
      : undefined;
  const knownPaymentCount = Number(subscription.data.paymentsReceived || 0);
  let processedPaymentCount = 0;

  for (const [index, transaction] of completedTransactions.entries()) {
    const grossAmount = transaction.amount_with_breakdown?.gross_amount;
    const paidAt = transaction.time || new Date().toISOString();
    const paymentOrder = await recordSubscriptionPaymentOrder({
      subscription,
      paymentId: transaction.id,
      paidAt,
      amount: Number(grossAmount?.value || 0),
      currency: grossAmount?.currency_code,
      isRenewal: knownPaymentCount + index > 0,
      paymentNumber: knownPaymentCount + index + 1,
      provisionBenefits: !benefitsProvisionedAt,
    });
    if (!paymentOrder) continue;
    processedPaymentCount += 1;
    if (!benefitsProvisionedAt) benefitsProvisionedAt = paidAt;
  }

  if (
    benefitsProvisionedAt &&
    subscription.data.benefitsProvisionedAt !== benefitsProvisionedAt
  ) {
    await updateFeatureRecord(subscription.id, subscription.userId, {
      data: {
        ...subscription.data,
        benefitsProvisionedAt,
      },
    });
  }

  return {
    status: details.status || subscription.status,
    processedPaymentCount,
    orderId:
      typeof subscription.data.orderId === "string"
        ? subscription.data.orderId
        : undefined,
    benefitsProvisionedAt,
  };
}

export async function reconcilePayPalSubscriptionsForMode(
  input: ReconcilePayPalSubscriptionsForModeInput
): Promise<ReconcilePayPalSubscriptionsForModeResult> {
  const records = await listFeatureRecords(
    input.userId,
    "subscriptions",
    input.mode
  );
  const candidates = records.filter(
    (record) =>
      record.data.source === "product_checkout" &&
      typeof record.data.paypalSubscriptionId === "string" &&
      (Number(record.data.paymentsReceived || 0) === 0 ||
        typeof record.data.benefitsProvisionedAt !== "string")
  );
  let reconciled = 0;
  let failed = 0;

  for (const subscription of candidates.slice(0, 25)) {
    try {
      const result = await reconcilePayPalSubscription({ subscription });
      if (result.processedPaymentCount > 0) reconciled += 1;
    } catch (error) {
      failed += 1;
      console.error("PayPal subscription reconciliation failed", {
        mode: input.mode,
        subscriptionId: subscription.data.paypalSubscriptionId,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    checked: Math.min(candidates.length, 25),
    reconciled,
    failed,
  };
}
