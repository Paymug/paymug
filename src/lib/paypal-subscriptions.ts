import "server-only";

import {
  getPayPalAccessToken,
  paypalBaseUrl,
} from "./paypal";
import { getPayPalCredentials } from "./payment-credentials";
import {
  normalizeLegacySubscriptionInterval,
  toPayPalIntervalUnit,
} from "./product-billing";
import { ensurePayPalSubscriptionWebhook } from "./paypal-webhooks";
import { getRuntimeAbsoluteUrl } from "./runtime-env";
import { uid } from "./utils";
import type {
  PayPalSubscriptionProvisionInput,
  PayPalSubscriptionProvisionResult,
} from "./paypal-subscriptions.types";
import type { ProductIntervalUnit } from "./types";

async function paypalPost<T>(
  url: string,
  token: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      Prefer: "return=representation",
      "PayPal-Request-Id": uid(),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`PayPal subscription setup failed: ${await response.text()}`);
  }
  return (await response.json()) as T;
}

function resolveInterval(input: PayPalSubscriptionProvisionInput): {
  unit: ProductIntervalUnit;
  count: number;
} {
  if (input.intervalUnit) {
    return {
      unit: input.intervalUnit,
      count: Math.max(1, input.intervalCount || 1),
    };
  }
  if (input.interval === "yearly") return { unit: "year", count: 1 };
  if (input.interval === "weekly") return { unit: "week", count: 1 };
  if (input.interval === "monthly") return { unit: "month", count: 1 };
  return normalizeLegacySubscriptionInterval(input.interval);
}

export async function provisionPayPalSubscription(
  input: PayPalSubscriptionProvisionInput
): Promise<PayPalSubscriptionProvisionResult> {
  const connection = await getPayPalCredentials(
    input.userId,
    input.mode,
    input.storeId
  );
  if (!connection) {
    throw new Error(
      `Add PayPal ${input.mode} credentials before creating subscriptions`
    );
  }
  const webhookSetup = await ensurePayPalSubscriptionWebhook({
    userId: input.userId,
    mode: input.mode,
    clientId: connection.clientId,
    clientSecret: connection.clientSecret,
    requestUrl: input.requestUrl,
  });
  if (webhookSetup.webhookStatus !== "active") {
    throw new Error(
      webhookSetup.webhookError ||
        "Complete PayPal subscription webhook setup before creating subscriptions"
    );
  }

  const token = await getPayPalAccessToken(
    connection.clientId,
    connection.clientSecret,
    input.mode
  );
  const baseUrl = paypalBaseUrl(input.mode);
  const cadence = resolveInterval(input);
  const currency = (input.currency || "USD").toUpperCase();
  const intervalLabel =
    cadence.count === 1
      ? cadence.unit
      : `${cadence.count} ${cadence.unit}s`;
  const introductoryPeriodCount = Math.max(
    0,
    Math.floor(input.introductoryPeriodCount || 0)
  );
  const hasIntroductoryDiscount =
    introductoryPeriodCount > 0 &&
    input.introductoryAmount !== undefined &&
    input.introductoryAmount < input.amount;

  const product = await paypalPost<{ id: string }>(
    `${baseUrl}/v1/catalogs/products`,
    token,
    {
      name: input.planName,
      description: `Paymug subscription: ${input.planName}`,
      type: "DIGITAL",
      category: "SOFTWARE",
    }
  );

  const plan = await paypalPost<{ id: string }>(
    `${baseUrl}/v1/billing/plans`,
    token,
    {
      product_id: product.id,
      name: input.planName.slice(0, 127),
      description:
        input.trialDays > 0
          ? `Recurring every ${intervalLabel} with a ${input.trialDays}-day free trial`
          : `Recurring every ${intervalLabel}`,
      billing_cycles: [
        ...(input.trialDays > 0
          ? [
              {
                frequency: {
                  interval_unit: "DAY",
                  interval_count: input.trialDays,
                },
                tenure_type: "TRIAL",
                sequence: 1,
                total_cycles: 1,
              },
            ]
          : []),
        ...(hasIntroductoryDiscount
          ? [
              {
                frequency: {
                  interval_unit: toPayPalIntervalUnit(cadence.unit),
                  interval_count: cadence.count,
                },
                tenure_type: "TRIAL",
                sequence: input.trialDays > 0 ? 2 : 1,
                total_cycles: introductoryPeriodCount,
                pricing_scheme: {
                  fixed_price: {
                    value: input.introductoryAmount!.toFixed(2),
                    currency_code: currency,
                  },
                },
              },
            ]
          : []),
        {
          frequency: {
            interval_unit: toPayPalIntervalUnit(cadence.unit),
            interval_count: cadence.count,
          },
          tenure_type: "REGULAR",
          sequence:
            1 +
            (input.trialDays > 0 ? 1 : 0) +
            (hasIntroductoryDiscount ? 1 : 0),
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: input.amount.toFixed(2),
              currency_code: currency,
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 1,
      },
    }
  );

  const subscription = await paypalPost<{
    id: string;
    links?: Array<{ href: string; rel: string }>;
  }>(`${baseUrl}/v1/billing/subscriptions`, token, {
    plan_id: plan.id,
    custom_id: input.recordId,
    subscriber: {
      email_address: input.customerEmail,
    },
    application_context: {
      brand_name: "Paymug",
      user_action: "SUBSCRIBE_NOW",
      return_url: await getRuntimeAbsoluteUrl(
        `/subscription/approved?recordId=${input.recordId}`,
        input.requestUrl
      ),
      cancel_url: await getRuntimeAbsoluteUrl(
        `/subscription/cancelled?recordId=${input.recordId}`,
        input.requestUrl
      ),
    },
  });
  const approvalUrl = subscription.links?.find(
    (link) => link.rel === "approve"
  )?.href;
  if (!approvalUrl) throw new Error("PayPal did not return an approval link");

  return {
    paypalProductId: product.id,
    paypalPlanId: plan.id,
    paypalSubscriptionId: subscription.id,
    approvalUrl,
  };
}

export async function getPayPalSubscriptionStatus(input: {
  userId: string;
  storeId?: string;
  mode: PayPalSubscriptionProvisionInput["mode"];
  subscriptionId: string;
}): Promise<string> {
  const connection = await getPayPalCredentials(
    input.userId,
    input.mode,
    input.storeId
  );
  if (!connection) throw new Error("PayPal connection not found");
  const token = await getPayPalAccessToken(
    connection.clientId,
    connection.clientSecret,
    input.mode
  );
  const response = await fetch(
    `${paypalBaseUrl(input.mode)}/v1/billing/subscriptions/${input.subscriptionId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error("Could not verify PayPal subscription");
  const result = (await response.json()) as { status?: string };
  return result.status || "UNKNOWN";
}

export async function changePayPalSubscriptionState(input: {
  userId: string;
  storeId?: string;
  mode: PayPalSubscriptionProvisionInput["mode"];
  subscriptionId: string;
  action: "activate" | "suspend" | "cancel";
}): Promise<void> {
  const connection = await getPayPalCredentials(
    input.userId,
    input.mode,
    input.storeId
  );
  if (!connection) throw new Error("PayPal connection not found");
  const token = await getPayPalAccessToken(
    connection.clientId,
    connection.clientSecret,
    input.mode
  );
  const response = await fetch(
    `${paypalBaseUrl(input.mode)}/v1/billing/subscriptions/${input.subscriptionId}/${input.action}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: `Subscription ${input.action}d from Paymug`,
      }),
    }
  );
  if (!response.ok) {
    throw new Error(`PayPal could not ${input.action} this subscription`);
  }
}
