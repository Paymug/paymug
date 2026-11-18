"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelCustomerSubscription } from "./CustomerSubscriptionCancel.utils";
import type { CustomerSubscriptionCancelProps } from "./CustomerSubscriptionCancel.types";

export function CustomerSubscriptionCancel({
  subscriptionId,
  planName,
}: CustomerSubscriptionCancelProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function cancel() {
    setBusy(true);
    setError(undefined);
    try {
      await cancelCustomerSubscription(subscriptionId);
      router.refresh();
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Could not cancel the subscription",
      );
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="mt-4 text-sm font-medium text-[#c0392b] hover:underline"
      >
        Cancel subscription
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-lg bg-[#fdf3f2] p-3" role="alertdialog">
      <p className="text-sm text-[#5b2a25]">
        Cancel {planName}? Billing stops now and this can&apos;t be undone.
      </p>
      {error && <p className="mt-2 text-sm text-[#c0392b]">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          className="rounded-lg bg-[#c0392b] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Cancelling…" : "Yes, cancel"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="rounded-lg border border-[#e8e8ee] bg-white px-3 py-1.5 text-sm font-medium"
        >
          Keep plan
        </button>
      </div>
    </div>
  );
}
