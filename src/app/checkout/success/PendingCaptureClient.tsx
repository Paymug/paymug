"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Spinner } from "@/components/ui";

export function PendingCaptureClient({
  orderId,
  paypalOrderId,
  productName,
}: {
  orderId: string;
  paypalOrderId: string;
  productName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function capture() {
      try {
        const res = await fetch("/api/payments/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, paypalOrderId }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Capture failed");
        if (!cancelled) router.refresh();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not complete payment");
        }
      }
    }

    capture();
    return () => {
      cancelled = true;
    };
  }, [orderId, paypalOrderId, router]);

  if (error) {
    return (
      <>
        <h1 className="text-2xl font-bold">Almost there</h1>
        <p className="mt-2 text-muted">We couldn&apos;t finalize {productName}.</p>
        <div className="mt-4 w-full max-w-md">
          <Alert>{error}</Alert>
        </div>
      </>
    );
  }

  return (
    <>
      <Spinner className="h-8 w-8 text-dark" />
      <h1 className="mt-4 text-2xl font-bold">Confirming payment…</h1>
      <p className="mt-2 text-muted">Please wait while we capture your PayPal payment for {productName}.</p>
    </>
  );
}
