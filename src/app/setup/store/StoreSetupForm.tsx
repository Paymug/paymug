"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Input } from "@/components/ui";
import type { CreateStoreResponse } from "./StoreSetupForm.types";

export function StoreSetupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setupStore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await response.json()) as CreateStoreResponse;
      if (!response.ok) {
        throw new Error(data.error || "Could not set up store");
      }
      router.push("/dashboard/setup");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not set up store",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={setupStore} className="mt-6 space-y-4">
      {error && <Alert>{error}</Alert>}
      <Input
        label="Store name"
        name="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Acme Digital"
        required
      />
      <p className="text-sm text-muted">
        You can update these details and connect your payment gateway later.
      </p>
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Setting up…" : "Set up store"}
      </Button>
    </form>
  );
}
