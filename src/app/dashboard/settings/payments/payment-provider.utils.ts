import type { PaymentProviderResponse } from "./page.types";

export async function fetchPaymentProvider(): Promise<PaymentProviderResponse> {
  const response = await fetch("/api/payments/provider");
  const data = (await response.json()) as PaymentProviderResponse;
  if (!response.ok) throw new Error(data.error || "Could not load payment provider");
  return data;
}

export async function savePaymentProvider(
  provider: PaymentProviderResponse["provider"]
): Promise<PaymentProviderResponse> {
  const response = await fetch("/api/payments/provider", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider }),
  });
  const data = (await response.json()) as PaymentProviderResponse;
  if (!response.ok) throw new Error(data.error || "Could not save payment provider");
  return data;
}
