"use client";

import { useState } from "react";
import { Alert, Button } from "./ui";
import { createStripeCheckout } from "./stripe-checkout-button.utils";
import type { StripeCheckoutButtonProps } from "./StripeCheckoutButton.types";

export function StripeCheckoutButton({
  disabled,
  label = "Pay securely with Stripe",
  ...details
}: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setLoading(true);
    setError(null);
    try {
      window.location.assign(await createStripeCheckout(details));
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Could not start Stripe Checkout"
      );
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && <Alert>{error}</Alert>}
      <Button
        type="button"
        className="w-full bg-accent hover:bg-accent-hover"
        disabled={disabled || loading}
        onClick={checkout}
      >
        {loading ? "Opening Stripe…" : label}
      </Button>
    </div>
  );
}
