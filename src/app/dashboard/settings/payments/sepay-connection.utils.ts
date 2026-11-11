import type { PayPalMode } from "@/lib/types";
import type { StripeConnectionResponse } from "./page.types";

export async function fetchSepayConnection(
  mode: PayPalMode
): Promise<StripeConnectionResponse> {
  const response = await fetch(`/api/payments/sepay/connect?mode=${mode}`);
  const data = (await response.json()) as StripeConnectionResponse;
  if (!response.ok) throw new Error(data.error || "SePay request failed");
  return data;
}
