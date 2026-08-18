import type { PayPalMode } from "./types";

export function paypalBaseUrl(mode: PayPalMode): string {
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export async function getPayPalAccessToken(
  clientId: string,
  clientSecret: string,
  mode: PayPalMode
): Promise<string> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${paypalBaseUrl(mode)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PayPal auth failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/** Verify credentials work by fetching an access token. */
export async function verifyPayPalCredentials(
  clientId: string,
  clientSecret: string,
  mode: PayPalMode
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await getPayPalAccessToken(clientId, clientSecret, mode);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Invalid PayPal credentials",
    };
  }
}

export interface CreatePayPalOrderParams {
  clientId: string;
  clientSecret: string;
  mode: PayPalMode;
  amountCents: number;
  currency: string;
  productName: string;
  customId: string; // our order id
  returnUrl: string;
  cancelUrl: string;
}

export async function createPayPalOrder(params: CreatePayPalOrderParams): Promise<{ id: string }> {
  const token = await getPayPalAccessToken(params.clientId, params.clientSecret, params.mode);
  const value = (params.amountCents / 100).toFixed(2);

  const res = await fetch(`${paypalBaseUrl(params.mode)}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: params.customId,
          description: params.productName.slice(0, 127),
          amount: {
            currency_code: params.currency.toUpperCase(),
            value,
          },
        },
      ],
      application_context: {
        brand_name: "Paymug Checkout",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PayPal create order failed (${res.status}): ${body}`);
  }

  return (await res.json()) as { id: string };
}

export async function capturePayPalOrder(
  clientId: string,
  clientSecret: string,
  mode: PayPalMode,
  paypalOrderId: string
): Promise<{
  id: string;
  status: string;
  captureId?: string;
  payerEmail?: string;
  payerName?: string;
}> {
  const token = await getPayPalAccessToken(clientId, clientSecret, mode);

  const res = await fetch(
    `${paypalBaseUrl(mode)}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PayPal capture failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as {
    id: string;
    status: string;
    payer?: {
      email_address?: string;
      name?: { given_name?: string; surname?: string };
    };
    purchase_units?: Array<{
      payments?: {
        captures?: Array<{ id: string; status: string }>;
      };
    }>;
  };

  const captureId = data.purchase_units?.[0]?.payments?.captures?.[0]?.id;
  const given = data.payer?.name?.given_name ?? "";
  const surname = data.payer?.name?.surname ?? "";
  const payerName = [given, surname].filter(Boolean).join(" ") || undefined;

  return {
    id: data.id,
    status: data.status,
    captureId,
    payerEmail: data.payer?.email_address,
    payerName,
  };
}
