"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui";
import { badgeBaseClass, badgeVariantClasses } from "@/components/ui.styles";
import type {
  StripeConnectionCardProps,
  StripeConnectionResponse,
} from "./page.types";
import { fetchStripeConnection } from "./stripe-connection.utils";

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

export function StripeConnectionCard({
  mode,
  onStatusChange,
}: StripeConnectionCardProps) {
  const [connection, setConnection] =
    useState<StripeConnectionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void fetchStripeConnection(mode)
      .then((data) => {
        if (!active) return;
        setConnection(data);
        onStatusChange?.(Boolean(data.connected));
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load Stripe configuration"
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, onStatusChange]);

  if (loading) {
    return (
      <div className="p-1 sm:p-2">
        <div className="flex items-center text-sm text-muted">
          <Spinner className="mr-2 h-4 w-4" /> Loading Stripe {mode}…
        </div>
      </div>
    );
  }

  const missing = connection?.missingEnvVars ?? [];
  const configured = connection?.configuredEnvVars ?? [];

  return (
    <div className="p-1 sm:p-2">
      {error && (
        <p className="rounded-lg bg-[#fdf0f0] px-3 py-2 text-sm text-[#b3403a]">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium text-foreground">
            Stripe {mode} credentials
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
        <p className="mt-1">
          <span className="text-foreground">Webhook:</span>{" "}
          {connection?.webhookConfigured ? (
            <span className="font-medium text-[#178f55]">Configured</span>
          ) : (
            <span className="font-medium text-[#b3403a]">
              Requires STRIPE_{mode.toUpperCase()}_WEBHOOK_SECRET
            </span>
          )}
        </p>
        {connection?.webhookUrl && (
          <p className="mt-1 break-all text-muted">
            <span className="text-foreground">Endpoint:</span>{" "}
            <code className="font-mono text-xs">{connection.webhookUrl}</code>
          </p>
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
        <div className="mt-4 space-y-4">
          <EnvVarList title="Set" names={configured} />
          <EnvVarList title="Missing" names={missing} />
        </div>
      </div>
    </div>
  );
}
