"use client";

import {
  Flask,
  Pause,
  Play,
  Plus,
  Trash,
  WebhooksLogo,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { OutboundWebhookRecord } from "@/lib/outbound-webhooks.types";
import { Alert, Button, Spinner } from "@/components/ui";
import {
  badgeBaseClass,
  badgeVariantClasses,
  buttonBaseClass,
  buttonVariantClasses,
} from "@/components/ui.styles";
import {
  dashboardCardClass,
  dashboardIconButtonClass,
} from "./dashboard.styles";
import type { WebhooksResponse } from "./WebhooksWorkspace.types";
import {
  getWebhookDeliveryResponse,
  getWebhookEventLabel,
} from "./webhooks-workspace.utils";

export function WebhooksWorkspace() {
  const [webhooks, setWebhooks] = useState<OutboundWebhookRecord[]>([]);
  const [deliveries, setDeliveries] = useState<
    NonNullable<WebhooksResponse["deliveries"]>
  >([]);
  const [loading, setLoading] = useState(true);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/webhooks");
      const data = (await response.json()) as WebhooksResponse;
      if (!response.ok) throw new Error(data.error || "Could not load webhooks");
      setWebhooks(data.webhooks || []);
      setDeliveries(data.deliveries || []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load webhooks",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function requestWebhook(
    webhook: OutboundWebhookRecord,
    action: "status" | "delete",
  ) {
    setError(null);
    const response = await fetch("/api/webhooks/" + webhook.id, {
      method: action === "delete" ? "DELETE" : "PATCH",
      ...(action === "status"
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: webhook.status === "active" ? "paused" : "active",
            }),
          }
        : {}),
    });
    const data = (await response.json()) as WebhooksResponse;
    if (!response.ok) {
      setError(data.error || "Could not update webhook");
      return;
    }
    await load();
  }

  async function sendTest(webhook: OutboundWebhookRecord) {
    setTestingWebhookId(webhook.id);
    setTestMessage(null);
    setError(null);
    try {
      const response = await fetch(
        "/api/webhooks/" + webhook.id + "/test",
        { method: "POST" },
      );
      const data = (await response.json()) as WebhooksResponse;
      if (!response.ok) {
        throw new Error(data.error || "Could not send test webhook");
      }
      await load();
      setTestMessage(
        "Test webhook sent to “" + webhook.name + "”. View its response below.",
      );
    } catch (testError) {
      setError(
        testError instanceof Error
          ? testError.message
          : "Could not send test webhook",
      );
    } finally {
      setTestingWebhookId(null);
    }
  }

  async function removeWebhook(webhook: OutboundWebhookRecord) {
    if (!confirm("Delete “" + webhook.name + "” and its delivery history?")) return;
    await requestWebhook(webhook, "delete");
  }

  return (
    <div className="mt-6">
      <div className="flex justify-end">
        <Link
          href="/dashboard/settings/webhooks/new"
          className={buttonBaseClass + " " + buttonVariantClasses.primary}
        >
          <Plus size={15} weight="bold" aria-hidden />
          Add webhook
        </Link>
      </div>

      {error && <div className="mt-3"><Alert>{error}</Alert></div>}
      {testMessage && (
        <div className="mt-3">
          <Alert variant="success">{testMessage}</Alert>
        </div>
      )}

      <div className={dashboardCardClass + " mt-3 overflow-hidden"}>
        {loading ? (
          <div className="flex min-h-56 items-center justify-center text-sm text-muted">
            <Spinner className="mr-2 h-4 w-4" /> Loading…
          </div>
        ) : webhooks.length === 0 ? (
          <div className="flex min-h-56 items-center justify-center p-8 text-center">
            <div className="max-w-sm">
              <WebhooksLogo className="mx-auto text-muted" size={32} aria-hidden />
              <h2 className="mt-3 text-sm font-semibold">No webhook endpoints yet</h2>
              <p className="mt-2 text-sm leading-5 text-muted">
                Add an endpoint to receive commerce events in real time.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="relative p-4 transition hover:bg-stone-50"
              >
                <Link
                  href={"/dashboard/settings/webhooks/" + webhook.id}
                  className="absolute inset-0 z-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                  aria-label={"Edit " + webhook.name}
                />
                <div className="pointer-events-none relative z-[1] flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{webhook.name}</p>
                      <span
                        className={
                          badgeBaseClass +
                          " " +
                          badgeVariantClasses[
                            webhook.status === "active" ? "success" : "muted"
                          ]
                        }
                      >
                        {webhook.status === "active" ? "Active" : "Paused"}
                      </span>
                    </div>
                    <p className="mt-1 break-all font-mono text-xs text-muted">
                      {webhook.url}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {webhook.authConfigured && (
                        <span
                          className={
                            badgeBaseClass + " " + badgeVariantClasses.success
                          }
                        >
                          Auth configured
                        </span>
                      )}
                      {webhook.events.map((eventName) => (
                        <span
                          key={eventName}
                          className={badgeBaseClass + " " + badgeVariantClasses.muted}
                        >
                          {getWebhookEventLabel(eventName)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="pointer-events-auto flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="!px-3 !py-2"
                      disabled={testingWebhookId === webhook.id}
                      onClick={() => void sendTest(webhook)}
                      aria-label={"Test " + webhook.name}
                    >
                      <Flask size={16} aria-hidden />
                      {testingWebhookId === webhook.id ? "Sending…" : "Send test"}
                    </Button>
                    <button
                      type="button"
                      className={dashboardIconButtonClass}
                      onClick={() => void requestWebhook(webhook, "status")}
                      aria-label={
                        (webhook.status === "active" ? "Pause " : "Activate ") +
                        webhook.name
                      }
                    >
                      {webhook.status === "active" ? (
                        <Pause size={16} aria-hidden />
                      ) : (
                        <Play size={16} aria-hidden />
                      )}
                    </button>
                    <button
                      type="button"
                      className={dashboardIconButtonClass}
                      onClick={() => void removeWebhook(webhook)}
                      aria-label={"Delete " + webhook.name}
                    >
                      <Trash size={16} aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-2 mt-8">
        <h2 className="text-base font-semibold">Recent deliveries</h2>
        <p className="mt-1 text-sm text-muted">
          HTTP status and response from each endpoint.
        </p>
      </div>
      <div className={dashboardCardClass + " overflow-hidden"}>
        {deliveries.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            No events have been delivered yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Endpoint</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Response</th>
                  <th className="px-4 py-3 font-medium">Delivered</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((delivery) => {
                  const webhook = webhooks.find(
                    (item) => item.id === delivery.webhookId,
                  );
                  const statusVariant =
                    delivery.status === "success"
                      ? "success"
                      : delivery.status === "failed"
                        ? "danger"
                        : "warning";
                  return (
                    <tr
                      key={delivery.id}
                      className="border-b border-border align-top last:border-0"
                    >
                      <td className="px-4 py-3 font-medium">
                        {getWebhookEventLabel(delivery.eventName)}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {webhook?.name || "Deleted endpoint"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            badgeBaseClass +
                            " " +
                            badgeVariantClasses[statusVariant]
                          }
                        >
                          {delivery.responseStatus || delivery.status}
                        </span>
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <details>
                          <summary className="cursor-pointer text-muted">
                            View response
                          </summary>
                          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-stone-50 p-2 text-xs">
                            {getWebhookDeliveryResponse(delivery)}
                          </pre>
                        </details>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">
                        {new Date(delivery.createdAt).toLocaleString()}
                        {delivery.durationMs !== undefined && (
                          <span className="block text-xs">
                            {delivery.durationMs} ms
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
