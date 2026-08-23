"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import type { CreateWebhookFormProps } from "./CreateWebhookForm.types";
import type {
  WebhookFormValues,
  WebhooksResponse,
} from "./WebhooksWorkspace.types";

const initialForm: WebhookFormValues = {
  name: "",
  url: "",
  auth: "",
  productId: "",
  event: "",
};

export function CreateWebhookForm({ productOptions }: CreateWebhookFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<WebhookFormValues>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createWebhook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          url: values.url,
          auth: values.auth,
          productId: values.productId,
          events: [values.event],
        }),
      });
      const data = (await response.json()) as WebhooksResponse;
      if (!response.ok || !data.webhook) {
        throw new Error(data.error || "Could not create webhook");
      }
      router.push("/dashboard/settings/webhooks");
      router.refresh();
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
      <div className="mt-5 flex gap-2">
        <Button
          type="submit"
          disabled={saving || !values.productId || !values.event}
        >
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
