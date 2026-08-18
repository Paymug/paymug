import type {
  CreateStripeCheckoutSessionInput,
  StripeAccount,
  StripeCheckoutSession,
} from "./stripe.types";

const STRIPE_API_URL = "https://api.stripe.com/v1";

async function stripeRequest<T>(
  secretKey: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${STRIPE_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(body?.error?.message || `Stripe request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function verifyStripeSecretKey(
  secretKey: string,
  mode: CreateStripeCheckoutSessionInput["mode"]
): Promise<StripeAccount> {
  const expectedPrefix = mode === "live" ? "sk_live_" : "sk_test_";
  if (!secretKey.startsWith(expectedPrefix)) {
    throw new Error(`Use a ${mode === "live" ? "live" : "test"} secret key for this mode`);
  }
  return stripeRequest<StripeAccount>(secretKey, "/account");
}

export async function createStripeCheckoutSession(
  input: CreateStripeCheckoutSessionInput
): Promise<StripeCheckoutSession> {
  const isSubscription = Boolean(input.subscription);
  const discount = input.subscription?.discount;
  let coupon: { id: string } | undefined;
  if (discount) {
    const couponBody = new URLSearchParams({
      amount_off: String(discount.amountOffCents),
      currency: input.currency.toLowerCase(),
      duration: discount.duration,
      name: "Paymug introductory discount",
      "metadata[orderId]": input.orderId,
    });
    if (discount.duration === "repeating" && discount.durationInMonths) {
      couponBody.set("duration_in_months", String(discount.durationInMonths));
    }
    coupon = await stripeRequest<{ id: string }>(input.secretKey, "/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: couponBody,
    });
  }
  const body = new URLSearchParams({
    mode: isSubscription ? "subscription" : "payment",
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.customerEmail,
    client_reference_id: input.orderId,
    "metadata[orderId]": input.orderId,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": input.currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(input.amountCents),
    "line_items[0][price_data][product_data][name]": input.productName.slice(0, 250),
  });
  if (input.subscription) {
    body.set(
      "line_items[0][price_data][recurring][interval]",
      input.subscription.interval
    );
    body.set(
      "line_items[0][price_data][recurring][interval_count]",
      String(Math.max(1, input.subscription.intervalCount))
    );
    body.set("subscription_data[metadata][orderId]", input.orderId);
    if (input.subscription.trialDays && input.subscription.trialDays > 0) {
      body.set(
        "subscription_data[trial_period_days]",
        String(input.subscription.trialDays)
      );
    }
    if (coupon) body.set("discounts[0][coupon]", coupon.id);
  }
  if (input.metadata) {
    for (const [key, value] of Object.entries(input.metadata)) {
      body.set(`metadata[${key}]`, value);
    }
  }
  return stripeRequest<StripeCheckoutSession>(input.secretKey, "/checkout/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

export async function retrieveStripeCheckoutSession(
  secretKey: string,
  sessionId: string
): Promise<StripeCheckoutSession> {
  return stripeRequest<StripeCheckoutSession>(
    secretKey,
    `/checkout/sessions/${encodeURIComponent(sessionId)}`
  );
}
