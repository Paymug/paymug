/** Deterministic, so a redelivered invoice webhook maps to the same order. */
export function stripeInvoiceOrderId(invoiceId: string): string {
  return `stripe_${invoiceId}`;
}

/**
 * Maps a Stripe subscription status to a Paymug subscription status. Returns
 * undefined for transient states (`incomplete`) that should not change the record.
 */
export function mapStripeSubscriptionStatus(
  stripeStatus: string,
): string | undefined {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "unpaid":
      return "suspended";
    case "paused":
      return "paused";
    case "canceled":
      return "cancelled";
    case "incomplete_expired":
      return "expired";
    default:
      return undefined;
  }
}
