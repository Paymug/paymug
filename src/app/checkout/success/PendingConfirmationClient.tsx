"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui";

export function PendingConfirmationClient({
  productName,
}: {
  productName: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [router]);

  return (
    <>
      <h1 className="text-2xl font-bold">Confirming your payment</h1>
      <p className="mt-2 text-muted">
        Waiting for the bank to confirm payment for {productName}. This page
        updates automatically.
      </p>
      <Spinner className="mt-6 h-5 w-5" />
    </>
  );
}
