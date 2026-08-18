"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Spinner } from "@/components/ui";
import { badgeBaseClass, badgeVariantClasses } from "@/components/ui.styles";
import type {
  PayPalConnectionCardProps,
  PayPalConnectionResponse,
} from "./page.types";
import {
  fetchPayPalConnection,
  setupPayPalWebhook,
} from "./paypal-connection.utils";

function EnvVarList({
  title,
  names,
}: {
  title: string;
  names: string[];
}) {
  if (names.length === 0) return null;
  return (
    <div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <ul className="mt-2 list-inside list-disc space-y-1">
        {names.map((name) => (
          <li key={name}>
            <code className="rounded bg-[#f5f5f8] px-1.5 py-0.5 font-mono text-xs">
              {name}
            </code>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PayPalConnectionCard({
  mode,
  onStatusChange,
}: PayPalConnectionCardProps) {
  const [connection, setConnection] =
    useState<PayPalConnectionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(
    (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      setSuccess(null);
      void fetchPayPalConnection(mode)
        .then((data) => {
          setConnection(data);
          onStatusChange?.(Boolean(data.connected));
        })
        .catch((loadError) => {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load PayPal configuration"
          );
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [mode, onStatusChange]
  );

  useEffect(() => {
    load();
  }, [load]);

  async function configureWebhook() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await setupPayPalWebhook(mode);
      if (data.webhookStatus === "active") {
        const eventCount = data.eventTypes?.length;
        const repaired = data.reconciliation?.reconciled || 0;
        setSuccess(
          repaired > 0
            ? `PayPal ${mode} webhook is active. Recovered ${repaired} subscription${repaired === 1 ? "" : "s"} and their related order records.`
            : eventCount
            ? `PayPal ${mode} webhook is active and listening for ${eventCount} events (payments, refunds, subscription renewals & cancellations).`
            : "PayPal webhook is active and subscribed to app payment events."
        );
      } else {
        setError(
          data.webhookError ||
            "Webhook setup requires a public HTTPS app URL."
        );
      }
      await load(true);
    } catch (webhookError) {
      setError(
        webhookError instanceof Error
          ? webhookError.message
          : "Webhook setup failed"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-1 sm:p-2">
        <div className="flex items-center text-sm text-muted">
          <Spinner className="mr-2 h-4 w-4" /> Loading PayPal {mode}…
        </div>
      </div>
    );
  }

  const webhookActive = connection?.webhookStatus === "active";
  const missing = connection?.missingEnvVars ?? [];
  const configured = connection?.configuredEnvVars ?? [];

  return (
    <div className="p-1 sm:p-2">
      {error && (
        <p className="rounded-lg bg-[#fdf0f0] px-3 py-2 text-sm text-[#b3403a]">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg bg-[#eefaf3] px-3 py-2 text-sm text-[#178f55]">
          {success}
        </p>
      )}

      <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium text-foreground">
            PayPal {mode} credentials
          </p>
          <span
            className={`${badgeBaseClass} ${
              connection?.connected
                ? badgeVariantClasses.success
                : badgeVariantClasses.warning
            }`}
          >
            {connection?.connected ? "Configured" : "Not configured"}
          </span>
        </div>
        {connection?.clientId && (
          <p className="mt-2 break-all text-muted">
            <span className="text-foreground">Client ID:</span>{" "}
            <code className="font-mono text-xs">{connection.clientId}</code>
          </p>
        )}
        <p className="mt-1">
          <span className="text-foreground">Webhook:</span>{" "}
          {webhookActive ? (
            <span className="font-medium text-[#178f55]">Active</span>
          ) : (
            <span className="font-medium text-[#b3403a]">Not set up</span>
          )}
        </p>
        {connection?.webhookUrl && (
          <p className="mt-1 break-all text-muted">
            <span className="text-foreground">Endpoint:</span>{" "}
            <code className="font-mono text-xs">{connection.webhookUrl}</code>
          </p>
        )}
        {connection?.webhookId && (
          <p className="mt-1 break-all text-muted">
            <span className="text-foreground">Webhook ID:</span>{" "}
            <code className="font-mono text-xs">{connection.webhookId}</code>
          </p>
        )}
        {connection?.connected && (
          <div className="mt-4 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={configureWebhook}
              disabled={saving}
            >
              {saving
                ? "Updating webhook endpoint…"
                : webhookActive
                  ? "Update webhook endpoint"
                  : "Set up webhook automatically"}
            </Button>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              This migrates existing PayPal webhooks to the stable endpoint for
              {" "}{mode} without changing the PayPal credentials.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-background p-4 text-sm text-muted">
        <p className="font-medium text-foreground">
          Configure credentials in the environment
        </p>
        <p className="mt-1 leading-relaxed">
          Payment credentials are read from environment variables, so they are
          never saved to the database. Set the variables below for this mode,
          then restart the deployment.
        </p>
        <ol className="mt-3 list-decimal space-y-1 pl-5">
          <li>Set the credential variables below for this mode.</li>
          <li>
            Click{" "}
            <span className="font-medium text-foreground">
              Set up webhook automatically
            </span>{" "}
            to register this app with PayPal for payment received, refunds,
            subscription renewals, cancellations, and related events.
          </li>
        </ol>
        <div className="mt-4 space-y-4">
          <EnvVarList title="Set" names={configured} />
          <EnvVarList title="Missing" names={missing} />
        </div>
      </div>
    </div>
  );
}
