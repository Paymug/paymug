"use client";

import { useState } from "react";
import { Alert, Button } from "./ui";
import {
  createSepayCheckout,
  postSepayCheckoutForm,
} from "./sepay-checkout-button.utils";
import type { SepayCheckoutButtonProps } from "./SepayCheckoutButton.types";

export function SepayCheckoutButton({
  disabled,
  label = "Pay with SePay",
  ...details
}: SepayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setLoading(true);
    setError(null);
    try {
      const { checkoutUrl, fields } = await createSepayCheckout(details);
      postSepayCheckoutForm(checkoutUrl, fields);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Could not start SePay checkout"
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
        {loading ? "Opening SePay…" : label}
      </Button>
    </div>
  );
}
