"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, Button, Input } from "@/components/ui";
import {
  buttonBaseClass,
  buttonVariantClasses,
} from "@/components/ui.styles";
import { outboundWebhookEventOptions } from "@/lib/outbound-webhook-events.config";
import type { OutboundWebhookEventName } from "@/lib/outbound-webhooks.types";
import { dashboardCardClass } from "./dashboard.styles";
import type { EditWebhookFormProps } from "./EditWebhookForm.types";
import type {
  WebhookFormValues,
  WebhooksResponse,
} from "./WebhooksWorkspace.types";

export function EditWebhookForm({ webhook }: EditWebhookFormProps) {
  const [values, setValues] = useState<WebhookFormValues>({
    name: webhook.name,
    url: webhook.url,
    auth: "",
    events: webhook.events,
  });
  const [authConfigured, setAuthConfigured] = useState(
    webhook.authConfigured,
  );
  const [removeAuth, setRemoveAuth] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleEvent(eventName: OutboundWebhookEventName) {
    setValues((current) => ({
      ...current,
      events: current.events.includes(eventName)
        ? current.events.filter((event) => event !== eventName)
        : [...current.events, eventName],
    }));
  }

  async function updateWebhook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/webhooks/" + webhook.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          url: values.url,
          events: values.events,
          ...(values.auth
            ? { auth: values.auth }
            : removeAuth
              ? { auth: null }
              : {}),
        }),
      });
      const data = (await response.json()) as WebhooksResponse;
      if (!response.ok || !data.webhook) {
        throw new Error(data.error || "Could not update webhook");
      }
      setValues((current) => ({ ...current, auth: "" }));
      setAuthConfigured(data.webhook.authConfigured);
      setRemoveAuth(false);
      setSaved(true);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update webhook",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={updateWebhook}
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
          required
        />
        <Input
          label={authConfigured ? "Replace auth (optional)" : "Auth (optional)"}
          name="auth"
          type="password"
          autoComplete="new-password"
          value={values.auth}
          disabled={removeAuth}
          onChange={(event) =>
            setValues((current) => ({ ...current, auth: event.target.value }))
          }
          placeholder={
            authConfigured
              ? "Leave blank to keep the current value"
              : "Bearer your-shared-token"
          }
        />
        <p className="-mt-2 text-xs leading-5 text-muted">
          Sent as the <code>Authorization</code> header. Stored auth values are
          never displayed.
        </p>
        {authConfigured && (
          <label className="-mt-1 flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#f5b942]"
              checked={removeAuth}
              onChange={(event) => {
                setRemoveAuth(event.target.checked);
                if (event.target.checked) {
                  setValues((current) => ({ ...current, auth: "" }));
                }
              }}
            />
            Remove the current Auth value
          </label>
        )}
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
      {saved && (
        <div className="mt-4">
          <Alert variant="success">Webhook updated.</Alert>
        </div>
      )}

      <div className="mt-5 flex gap-2">
        <Button type="submit" disabled={saving || values.events.length === 0}>
          {saving ? "Saving…" : "Save changes"}
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
