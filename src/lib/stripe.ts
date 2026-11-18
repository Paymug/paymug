import type {
  CreateStripeCheckoutSessionInput,
  StripeAccount,
  StripeCheckoutSession,
  StripeTaxSettings,
} from "./stripe.types";

/** Overridable so tests can point at a mock Stripe. */
const STRIPE_API_URL =
  (typeof process !== "undefined" && process.env?.STRIPE_API_BASE) ||
  "https://api.stripe.com/v1";

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
  if (input.automaticTax) {
    body.set("automatic_tax[enabled]", "true");
    // Prices are tax-exclusive: tax is added on top at Checkout.
    body.set("line_items[0][price_data][tax_behavior]", "exclusive");
    // Stripe Tax needs a customer address; Checkout collects it.
    body.set("billing_address_collection", "required");
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

/** Reads Stripe Tax settings (origin address, defaults, activation status). */
export async function retrieveStripeTaxSettings(
  secretKey: string
): Promise<StripeTaxSettings> {
  return stripeRequest<StripeTaxSettings>(secretKey, "/tax/settings");
}

interface StripeCustomerObject {
  id: string;
  email: string | null;
  invoice_settings?: { default_payment_method?: string | null };
}

interface StripePaymentMethodObject {
  id: string;
  card?: { last4?: string };
}

/** Customers whose email matches (case-insensitive), each with a usable card. */
export async function findStripeCardCustomersByEmail(
  secretKey: string,
  email: string,
): Promise<Array<{ customerId: string; paymentMethodId: string | null; last4: string | null }>> {
  const normalized = email.trim().toLowerCase();
  const query = `email:"${normalized.replaceAll('"', "")}"`;
  const found = await stripeRequest<{ data: StripeCustomerObject[] }>(
    secretKey,
    `/customers/search?limit=10&query=${encodeURIComponent(query)}`,
  );
  const customers = found.data.filter(
    (customer) => customer.email?.trim().toLowerCase() === normalized,
  );
  const result: Array<{ customerId: string; paymentMethodId: string | null; last4: string | null }> = [];
  for (const customer of customers) {
    let method: StripePaymentMethodObject | undefined;
    const defaultId = customer.invoice_settings?.default_payment_method;
    if (defaultId) {
      method = await stripeRequest<StripePaymentMethodObject>(
        secretKey,
        `/payment_methods/${encodeURIComponent(defaultId)}`,
      );
    } else {
      const methods = await stripeRequest<{ data: StripePaymentMethodObject[] }>(
        secretKey,
        `/customers/${encodeURIComponent(customer.id)}/payment_methods?type=card&limit=1`,
      );
      method = methods.data[0];
    }
    result.push({
      customerId: customer.id,
      paymentMethodId: method?.id ?? null,
      last4: method?.card?.last4 ?? null,
    });
  }
  return result;
}

/**
 * Creates a subscription that first bills at `firstChargeAt` (unix seconds) via
 * a trial. The idempotency key makes a retried call return the same
 * subscription instead of billing twice.
 */
export async function createStripeMigratedSubscription(
  secretKey: string,
  input: {
    customerId: string;
    paymentMethodId: string;
    currency: string;
    amountCents: number;
    interval: "week" | "month" | "year";
    intervalCount: number;
    productName: string;
    firstChargeAt: number;
    idempotencyKey: string;
    metadata: Record<string, string>;
  },
): Promise<{ id: string; status: string }> {
  const body = new URLSearchParams({
    customer: input.customerId,
    default_payment_method: input.paymentMethodId,
    trial_end: String(input.firstChargeAt),
    "items[0][price_data][currency]": input.currency.toLowerCase(),
    "items[0][price_data][unit_amount]": String(input.amountCents),
    "items[0][price_data][product_data][name]": input.productName.slice(0, 250),
    "items[0][price_data][recurring][interval]": input.interval,
    "items[0][price_data][recurring][interval_count]": String(Math.max(1, input.intervalCount)),
  });
  for (const [key, value] of Object.entries(input.metadata)) {
    body.set(`metadata[${key}]`, value);
  }
  return stripeRequest<{ id: string; status: string }>(secretKey, "/subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": input.idempotencyKey,
    },
    body,
  });
}

/**
 * Cancels a Stripe subscription immediately. Stripe answers 404 for an
 * unknown or already-deleted subscription; callers treat that as cancelled.
 */
export async function cancelStripeSubscription(
  secretKey: string,
  subscriptionId: string,
): Promise<void> {
  await stripeRequest<{ id: string; status: string }>(
    secretKey,
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    { method: "DELETE" },
  );
}
