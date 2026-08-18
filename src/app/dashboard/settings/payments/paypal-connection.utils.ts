import type { PayPalMode } from "@/lib/types";
import type {
  PayPalConnectionResponse,
  PayPalWebhookSetupResponse,
} from "./page.types";

async function readResponse(response: Response): Promise<PayPalConnectionResponse> {
  const data = (await response.json()) as PayPalConnectionResponse;
  if (!response.ok) throw new Error(data.error || "PayPal request failed");
  return data;
}

export async function fetchPayPalConnection(
  mode: PayPalMode
): Promise<PayPalConnectionResponse> {
  return readResponse(
    await fetch(`/api/payments/paypal/connect?mode=${mode}`)
  );
}

export async function setupPayPalWebhook(
  mode: PayPalMode
): Promise<PayPalWebhookSetupResponse> {
  const response = await fetch("/api/payments/paypal/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  const data = (await response.json()) as PayPalWebhookSetupResponse;
  if (!response.ok) throw new Error(data.error || "Webhook setup failed");
  return data;
}
