"use client";

import Link from "next/link";
import { useState } from "react";
import { CustomSelect } from "@/components/CustomSelect";
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

export function EditWebhookForm({
  webhook,
  productOptions,
}: EditWebhookFormProps) {
  const [values, setValues] = useState<WebhookFormValues>({
    name: webhook.name,
    url: webhook.url,
    auth: "",
    productId: webhook.productId || "",
    event: webhook.events.find((event) => event !== "webhook_test") || "",
  });
  const [authConfigured, setAuthConfigured] = useState(
    webhook.authConfigured,
  );
  const [removeAuth, setRemoveAuth] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          productId: values.productId,
          events: [values.event],
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
        <CustomSelect
          label="Product"
          name="productId"
          value={values.productId}
          options={[
            { value: "", label: "Select a product", disabled: true },
            ...productOptions,
          ]}
          onValueChange={(productId) =>
            setValues((current) => ({ ...current, productId }))
          }
          searchable
          required
        />
        <CustomSelect
          label="Event"
          name="event"
          value={values.event}
          options={[
            { value: "", label: "Select an event", disabled: true },
            ...outboundWebhookEventOptions.map((eventOption) => ({
              value: eventOption.name,
              label: eventOption.label,
            })),
          ]}
          onValueChange={(eventName) =>
            setValues((current) => ({
              ...current,
              event: eventName as Exclude<
                OutboundWebhookEventName,
                "webhook_test"
              >,
            }))
          }
          required
        />
      </div>

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
        <Button
          type="submit"
          disabled={saving || !values.productId || !values.event}
        >
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
