"use client";

import { Copy, Key, Plus, Prohibit } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Input, Spinner } from "@/components/ui";
import {
  badgeBaseClass,
  badgeVariantClasses,
} from "@/components/ui.styles";
import type { ApiKeyRecord } from "@/lib/feature-records.types";
import type { ApiKeysResponse } from "./ApiKeysWorkspace.types";
import {
  dashboardCardClass,
  dashboardIconButtonClass,
} from "./dashboard.styles";

export function ApiKeysWorkspace() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [name, setName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/api-keys");
      const data = (await response.json()) as ApiKeysResponse;
      if (!response.ok) throw new Error(data.error || "Could not load API keys");
      setKeys(data.keys || []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load API keys"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          expiresAt: expiresAt
            ? new Date(`${expiresAt}T23:59:59.999Z`).toISOString()
            : undefined,
        }),
      });
      const data = (await response.json()) as ApiKeysResponse;
      if (!response.ok || !data.secret) {
        throw new Error(data.error || "Could not create API key");
      }
      setSecret(data.secret);
      setName("");
      setExpiresAt("");
      setFormOpen(false);
      await load();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create API key"
      );
    } finally {
      setSaving(false);
    }
  }

  async function revokeKey(key: ApiKeyRecord) {
    if (!confirm(`Revoke “${key.name}”? This cannot be undone.`)) return;
    const response = await fetch(`/api/api-keys/${key.id}`, {
      method: "DELETE",
    });
    const data = (await response.json()) as ApiKeysResponse;
    if (!response.ok) {
      setError(data.error || "Could not revoke API key");
      return;
    }
    await load();
  }

  return (
    <div className="mt-6">
      <div className={`${dashboardCardClass} mb-4 p-4 text-sm leading-5 text-muted`}>
        Authenticate with <code>Authorization: Bearer YOUR_KEY</code>. Available
        read endpoints: <code>/api/v1/products</code>,{" "}
        <code>/api/v1/orders</code>, and <code>/api/v1/customers</code>.
      </div>
      <div className="flex justify-end">
        {!formOpen && (
          <Button type="button" onClick={() => setFormOpen(true)}>
            <Plus size={15} weight="bold" aria-hidden />
            Create API key
          </Button>
        )}
      </div>

      {secret && (
        <Alert variant="success">
          <p className="font-semibold">Copy this key now</p>
          <p className="mt-1 text-sm">
            It is shown only once and cannot be recovered later.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/70 p-2">
            <code className="min-w-0 flex-1 break-all text-sm">{secret}</code>
            <button
              type="button"
              className={`${dashboardIconButtonClass} !h-8 !w-8`}
              onClick={() => void navigator.clipboard.writeText(secret)}
              aria-label="Copy API key"
            >
              <Copy size={15} aria-hidden />
            </button>
          </div>
        </Alert>
      )}

      {formOpen && (
        <form
          onSubmit={createKey}
          className={`${dashboardCardClass} mt-3 grid gap-4 p-5 sm:grid-cols-2`}
        >
          <Input
            label="Key name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Production integration"
            required
          />
          <Input
            label="Expiration (optional)"
            name="expiresAt"
            type="date"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />
          {error && (
            <div className="sm:col-span-2">
              <Alert>{error}</Alert>
            </div>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create key"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {!formOpen && error && <div className="mt-3"><Alert>{error}</Alert></div>}

      <div className={`${dashboardCardClass} mt-3 overflow-hidden`}>
        {loading ? (
          <div className="flex min-h-56 items-center justify-center text-sm text-muted">
            <Spinner className="mr-2 h-4 w-4" /> Loading…
          </div>
        ) : keys.length === 0 ? (
          <div className="flex min-h-56 items-center justify-center p-8 text-center">
            <div className="max-w-sm">
              <Key className="mx-auto text-muted" size={30} aria-hidden />
              <h2 className="mt-3 text-sm font-semibold">No API keys yet</h2>
              <p className="mt-2 text-sm leading-5 text-muted">
                Create a key to authenticate requests to the Paymug API.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Key</th>
                  <th className="px-4 py-3 font-medium">Last used</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="w-20 px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{key.name}</td>
                    <td className="px-4 py-3 font-mono">{key.keyPrefix}</td>
                    <td className="px-4 py-3 text-muted">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`${badgeBaseClass} ${
                          badgeVariantClasses[key.revokedAt ? "danger" : "success"]
                        }`}
                      >
                        {key.revokedAt ? "Revoked" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!key.revokedAt && (
                        <button
                          type="button"
                          className={`${dashboardIconButtonClass} !h-8 !w-8`}
                          onClick={() => void revokeKey(key)}
                          aria-label={`Revoke ${key.name}`}
                        >
                          <Prohibit size={15} aria-hidden />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
