import type { StripeCheckoutDetails } from "./StripeCheckoutButton.types";

export async function createStripeCheckout(
  details: StripeCheckoutDetails
): Promise<string> {
  const response = await fetch("/api/payments/stripe/create-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details),
  });
  const data = (await response.json()) as {
    checkoutUrl?: string;
    error?: string;
  };
  if (!response.ok || !data.checkoutUrl) {
    throw new Error(data.error || "Could not start Stripe Checkout");
  }
  return data.checkoutUrl;
}
