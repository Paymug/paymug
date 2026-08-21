"use client";

import { Copy } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Alert, Button, Input } from "@/components/ui";
import {
  buttonBaseClass,
  buttonVariantClasses,
} from "@/components/ui.styles";
import { outboundWebhookEventOptions } from "@/lib/outbound-webhook-events.config";
import type { OutboundWebhookEventName } from "@/lib/outbound-webhooks.types";
import { dashboardCardClass, dashboardIconButtonClass } from "./dashboard.styles";
import type {
  WebhookFormValues,
  WebhooksResponse,
} from "./WebhooksWorkspace.types";

const initialForm: WebhookFormValues = {
  name: "",
  url: "",
  auth: "",
  events: [],
};

export function CreateWebhookForm() {
  const [values, setValues] = useState<WebhookFormValues>(initialForm);
  const [secret, setSecret] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleEvent(eventName: OutboundWebhookEventName) {
    setValues((current) => ({
      ...current,
      events: current.events.includes(eventName)
        ? current.events.filter((event) => event !== eventName)
        : [...current.events, eventName],
    }));
  }

  async function createWebhook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json()) as WebhooksResponse;
      if (!response.ok || !data.secret) {
        throw new Error(data.error || "Could not create webhook");
      }
      setSecret(data.secret);
      setValues(initialForm);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create webhook",
      );
    } finally {
      setSaving(false);
    }
  }

  if (secret) {
    return (
      <div className="mt-6 max-w-2xl">
        <Alert variant="success">
          <p className="font-semibold">Webhook created</p>
          <p className="mt-1">
            Copy the signing secret now. It is encrypted and cannot be shown
            again.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/70 p-2">
            <code className="min-w-0 flex-1 break-all text-sm">{secret}</code>
            <button
              type="button"
              className={dashboardIconButtonClass + " !h-8 !w-8"}
              onClick={() => void navigator.clipboard.writeText(secret)}
              aria-label="Copy webhook signing secret"
            >
              <Copy size={15} aria-hidden />
            </button>
          </div>
        </Alert>
        <Link
          href="/dashboard/settings/webhooks"
          className={
            buttonBaseClass + " " + buttonVariantClasses.primary + " mt-4"
          }
        >
          Back to webhooks
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={createWebhook}
      className={dashboardCardClass + " mt-6 max-w-2xl p-5"}
    >
      <div className="grid gap-4">
        <Input
          label="Name"
          name="name"
          value={values.name}
          onChange={(event) =>
            setValues((current) => ({ ...current, name: event.target.value }))
          }
          placeholder="Production endpoint"
          required
        />
        <Input
          label="Endpoint URL"
          name="url"
          type="url"
          value={values.url}
          onChange={(event) =>
            setValues((current) => ({ ...current, url: event.target.value }))
          }
          placeholder="https://example.com/webhooks/paymug"
          required
        />
        <Input
          label="Auth (optional)"
          name="auth"
          type="password"
          autoComplete="new-password"
          value={values.auth}
          onChange={(event) =>
            setValues((current) => ({ ...current, auth: event.target.value }))
          }
          placeholder="Bearer your-shared-token"
        />
        <p className="-mt-2 text-xs leading-5 text-muted">
          Sent as the <code>Authorization</code> header on every outbound
          request. Paymug never uses this value to authenticate incoming
          requests.
        </p>
      </div>
      <fieldset className="mt-5">
        <legend className="text-sm font-semibold">Events</legend>
        <div className="mt-2 grid gap-2">
          {outboundWebhookEventOptions.map((event) => (
            <label
              key={event.name}
              className="flex cursor-pointer gap-3 rounded-xl border border-border p-3 transition hover:bg-stone-50"
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[#f5b942]"
                checked={values.events.includes(event.name)}
                onChange={() => toggleEvent(event.name)}
              />
              <span>
                <span className="block text-sm font-medium">{event.label}</span>
                <span className="mt-0.5 block text-xs leading-4 text-muted">
                  {event.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      <div className="mt-5 flex gap-2">
        <Button type="submit" disabled={saving || values.events.length === 0}>
          {saving ? "Creating…" : "Create webhook"}
        </Button>
        <Link
          href="/dashboard/settings/webhooks"
          className={buttonBaseClass + " " + buttonVariantClasses.outline}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
