"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button } from "@/components/ui";
import type {
  StoreStatusResponse,
  StoreStatusSettingsProps,
} from "./StoreStatusSettings.types";

export function StoreStatusSettings({
  storeId,
  storeName,
}: StoreStatusSettingsProps) {
  const router = useRouter();
  const [deactivating, setDeactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deactivate() {
    if (
      !window.confirm(
        `Deactivate ${storeName}? Its storefront will be unavailable until you reactivate it.`,
      )
    ) {
      return;
    }
    setDeactivating(true);
    setError(null);
    const response = await fetch(`/api/stores/${storeId}/deactivate`, {
      method: "POST",
    });
    const data = (await response.json()) as StoreStatusResponse;
    setDeactivating(false);
    if (!response.ok) {
      setError(data.error || "Could not deactivate store");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-red-200 bg-white">
      <div className="border-b border-red-100 px-5 py-4 sm:px-6">
        <h2 className="text-lg font-semibold text-[#333]">Store status</h2>
        <p className="mt-1 text-sm text-[#85859d]">
          Deactivate this store without deleting its records or configuration.
        </p>
      </div>
      <div className="space-y-4 px-5 py-5 sm:px-6">
        <p className="text-sm leading-6 text-[#696978]">
          The storefront will become unavailable and you’ll switch to another
          active store. You can reactivate it from the store menu.
        </p>
        {error && <Alert>{error}</Alert>}
        <Button
          type="button"
          variant="danger"
          disabled={deactivating}
          onClick={() => void deactivate()}
        >
          {deactivating ? "Deactivating…" : "Deactivate store"}
        </Button>
      </div>
    </section>
  );
}
