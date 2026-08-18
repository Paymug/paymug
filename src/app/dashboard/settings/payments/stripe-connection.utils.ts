import type { PayPalMode } from "@/lib/types";
import type { StripeConnectionResponse } from "./page.types";

export async function fetchStripeConnection(
  mode: PayPalMode
): Promise<StripeConnectionResponse> {
  const response = await fetch(`/api/payments/stripe/connect?mode=${mode}`);
  const data = (await response.json()) as StripeConnectionResponse;
  if (!response.ok) throw new Error(data.error || "Stripe request failed");
  return data;
}
