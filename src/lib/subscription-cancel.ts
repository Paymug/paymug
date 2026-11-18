import "server-only";

import { findFeatureRecord, updateFeatureRecord } from "./feature-records";
import { notifySubscriptionUpdated } from "./notification-events";
import { getStripeCredentials } from "./payment-credentials";
import { changePayPalSubscriptionState } from "./paypal-subscriptions";
import { cancelStripeSubscription } from "./stripe";
import {
  isCancellableSubscriptionStatus,
  isTerminalSubscriptionStatus,
} from "./subscription-cancel.utils";
import { sendSubscriptionStatusEmail } from "./transactional-emails";
import type { FeatureRecord } from "./feature-records.types";
import type {
  CancelSubscriptionInput,
  SubscriptionCancelSource,
} from "./subscription-cancel.types";

export class SubscriptionCancelError extends Error {
  constructor(
    message: string,
    readonly status: 404 | 409 | 502,
  ) {
    super(message);
    this.name = "SubscriptionCancelError";
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

async function cancelWithProvider(record: FeatureRecord): Promise<void> {
  const storeId = text(record.data.storeId) || undefined;
  const paypalSubscriptionId = text(record.data.paypalSubscriptionId);
  const stripeSubscriptionId = text(record.data.stripeSubscriptionId);

  if (paypalSubscriptionId) {
    await changePayPalSubscriptionState({
      userId: record.userId,
      storeId,
      mode: record.environment,
      subscriptionId: paypalSubscriptionId,
      action: "cancel",
    });
  } else if (stripeSubscriptionId) {
    const credentials = await getStripeCredentials(
      record.userId,
      record.environment,
      storeId,
    );
    if (!credentials) {
      throw new Error(
        `Stripe ${record.environment} credentials are not configured`,
      );
    }
    await cancelStripeSubscription(credentials.secretKey, stripeSubscriptionId);
  }
  // Records with no provider id (free checkouts) only exist in Paymug.
}

/**
 * Cancels a subscription record at its payment provider, then marks it
 * cancelled. Already-cancelled records are returned unchanged, so retries are
 * safe. Ownership must be checked by the caller.
 */
export async function cancelSubscriptionRecord(
  record: FeatureRecord,
  input: { source: SubscriptionCancelSource; requestUrl?: string },
): Promise<FeatureRecord> {
  if (record.feature !== "subscriptions") {
    throw new SubscriptionCancelError("Subscription not found", 404);
  }
  if (isTerminalSubscriptionStatus(record.status)) return record;
  if (!isCancellableSubscriptionStatus(record.status)) {
    throw new SubscriptionCancelError(
      `A ${record.status.replaceAll("_", " ")} subscription cannot be cancelled`,
      409,
    );
  }

  try {
    await cancelWithProvider(record);
  } catch (error) {
    throw new SubscriptionCancelError(
      error instanceof Error
        ? error.message
        : "The payment provider could not cancel this subscription",
      502,
    );
  }

  const updated = await updateFeatureRecord(record.id, record.userId, {
    status: "cancelled",
    data: {
      ...record.data,
      cancelledAt: new Date().toISOString(),
      cancelledBy: input.source,
    },
  });
  if (!updated) throw new SubscriptionCancelError("Subscription not found", 404);

  await notifySubscriptionUpdated(
    record.userId,
    updated,
    `subscription-update:${updated.id}:${updated.updatedAt}`,
  );
  // PayPal sends its own cancellation webhook, which emails the customer.
  if (!text(record.data.paypalSubscriptionId)) {
    await sendSubscriptionStatusEmail({
      subscription: updated,
      status: "cancelled",
      requestUrl: input.requestUrl,
    });
  }
  return updated;
}

/** Cancels one of `userId`'s subscriptions in `environment` (API key / MCP). */
export async function cancelSubscriptionForOwner(
  input: CancelSubscriptionInput,
): Promise<FeatureRecord> {
  const record = await findFeatureRecord(input.id, input.userId);
  if (
    !record ||
    record.feature !== "subscriptions" ||
    record.environment !== input.environment
  ) {
    throw new SubscriptionCancelError("Subscription not found", 404);
  }
  return cancelSubscriptionRecord(record, {
    source: input.source,
    requestUrl: input.requestUrl,
  });
}

/** Cancels a subscription on behalf of the customer who owns `email`. */
export async function cancelSubscriptionForCustomer(input: {
  id: string;
  email: string;
  requestUrl?: string;
}): Promise<FeatureRecord> {
  const record = await findFeatureRecord(input.id);
  // Same error for "missing" and "someone else's" so ids cannot be probed.
  if (
    !record ||
    record.feature !== "subscriptions" ||
    (record.subtitle || "").toLowerCase() !== input.email.trim().toLowerCase()
  ) {
    throw new SubscriptionCancelError("Subscription not found", 404);
  }
  return cancelSubscriptionRecord(record, {
    source: "customer",
    requestUrl: input.requestUrl,
  });
}

export function toSubscriptionCancelResponse(error: unknown): Response {
  if (error instanceof SubscriptionCancelError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json(
    { error: "Could not cancel the subscription" },
    { status: 500 },
  );
}
