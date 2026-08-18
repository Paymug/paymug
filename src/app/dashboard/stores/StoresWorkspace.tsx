"use client";

import { Check, Plus, Storefront } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Input } from "@/components/ui";
import type { Store } from "@/lib/types";
import type {
  StoresApiResponse,
  StoresWorkspaceProps,
} from "./StoresWorkspace.types";

export function StoresWorkspace({
  initialStores,
  activeStoreId,
}: StoresWorkspaceProps) {
  const router = useRouter();
  const [stores, setStores] = useState(initialStores);
  const [name, setName] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    setWorking(true);
    setError("");
    const response = await fetch("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const result = (await response.json()) as StoresApiResponse;
    setWorking(false);
    if (!response.ok || !result.store) {
      setError(result.error || "Could not create store");
      return;
    }
    setStores((current) => [...current, result.store as Store]);
    setName("");
    router.refresh();
  }

  async function activate(storeId: string) {
    setWorking(true);
    setError("");
    const response = await fetch(`/api/stores/${storeId}/activate`, {
      method: "POST",
    });
    const result = (await response.json()) as StoresApiResponse;
    setWorking(false);
    if (!response.ok) {
      setError(result.error || "Could not switch store");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((store) => {
          const active = store.id === activeStoreId;
          return (
            <button
              key={store.id}
              type="button"
              disabled={working || active}
              onClick={() => void activate(store.id)}
              className="rounded-2xl border border-[#e8e8ee] bg-white p-5 text-left transition hover:border-[#d1d1dc] disabled:cursor-default"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f7f7f8]">
                  <Storefront size={20} />
                </span>
                {active && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <Check size={13} weight="bold" /> Active
                  </span>
                )}
              </div>
              <p className="mt-4 font-semibold">{store.name}</p>
              <p className="mt-1 truncate text-sm text-muted">/{store.slug}</p>
            </button>
          );
        })}
      </div>

      <form
        className="rounded-2xl border border-[#e8e8ee] bg-white p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        <h2 className="font-semibold">Add another store</h2>
        <div className="mt-4 flex items-end gap-3">
          <Input
            className="flex-1"
            label="Store name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Button type="submit" disabled={working}>
            <Plus size={16} /> Add store
          </Button>
        </div>
        {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      </form>
    </div>
  );
}
