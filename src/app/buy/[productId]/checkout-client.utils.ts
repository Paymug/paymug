import type {
  CompleteFreePurchaseInput,
  CompleteFreePurchaseResponse,
  DiscountPreviewResponse,
} from "./CheckoutClient.types";

export function isValidCheckoutEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function fetchDiscountPreview(
  productId: string,
  code: string
): Promise<DiscountPreviewResponse> {
  const response = await fetch("/api/checkout/discount", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, code }),
  });
  const data = (await response.json()) as DiscountPreviewResponse & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error || "Discount code is invalid");
  }
  return data;
}

export async function trackAffiliateVisit(
  productId: string,
  ref: string,
): Promise<void> {
  try {
    await fetch("/api/affiliate/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, ref }),
    });
  } catch {
    // Attribution tracking is best-effort and must never block checkout.
  }
}

export async function completeFreePurchase(
  input: CompleteFreePurchaseInput
): Promise<CompleteFreePurchaseResponse> {
  const response = await fetch("/api/checkout/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json()) as CompleteFreePurchaseResponse & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error || "Could not complete purchase");
  }
  return data;
}

export async function startPayPalSubscriptionCheckout(input: {
  productId: string;
  customerEmail: string;
  customerName?: string;
  discountCode?: string;
  affiliateCode?: string;
  marketingOptIn?: boolean;
}): Promise<string> {
  const response = await fetch("/api/payments/paypal/create-subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json()) as {
    approvalUrl?: string;
    error?: string;
  };
  if (!response.ok || !data.approvalUrl) {
    throw new Error(data.error || "Could not start subscription");
  }
  return data.approvalUrl;
}
