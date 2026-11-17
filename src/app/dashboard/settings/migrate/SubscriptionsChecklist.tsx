"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Input } from "@/components/ui";
import type { MigrationSubscriptionRow } from "@/lib/lemonsqueezy/subscription-state";

interface PlanItem {
  recordId: string;
  email: string;
  productName: string;
  action: "create" | "waiting" | "manual_review";
  reason: string;
  amountCents?: number;
  currency?: string;
  firstChargeAt?: number;
}

interface LinkResponse {
  dryRun: boolean;
  summary: { create: number; waiting: number; manualReview: number; plannedAmountCents: number };
  items: PlanItem[];
  linked: string[];
  failed: Array<{ recordId: string; message: string }>;
  error?: string;
}

const base = "/api/settings/migrate/lemonsqueezy/subscriptions";
const card = "rounded-2xl border border-[#e8e8ee] bg-white px-5 py-5 sm:px-6";

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function SubscriptionsChecklist({ refreshKey }: { refreshKey: string }) {
  const [rows, setRows] = useState<MigrationSubscriptionRow[]>([]);
  const [plan, setPlan] = useState<LinkResponse | null>(null);
  const [lsKey, setLsKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(base);
    if (!response.ok) return;
    setRows(((await response.json()) as { subscriptions: MigrationSubscriptionRow[] }).subscriptions);
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function act(task: () => Promise<string>) {
    setBusy(true);
    setNotice(null);
    try {
      setNotice({ ok: true, text: await task() });
      await load();
    } catch (error) {
      setNotice({ ok: false, text: error instanceof Error ? error.message : "Something went wrong" });
    } finally {
      setBusy(false);
    }
  }

  const pending = rows.filter((row) => row.status === "migration_pending");
  if (rows.length === 0) return null;
  const card_ = pending.filter((row) => row.processor === "stripe");
  const paypal = pending.filter((row) => row.processor === "paypal");
  const cancellable = rows.filter(
    (row) => !row.lsCancelledAt && (row.migrationState === "linked" || row.resubscribedAt),
  );
  const money = (cents: number, currency = "USD") =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);

  return (
    <section className={`${card} mt-6 space-y-5`} aria-label="Subscriptions checklist">
      <h3 className="text-base font-semibold text-[#333]">Subscriptions checklist</h3>
      <p className="text-sm text-[#85859d]">
        Imported subscriptions do not bill until you move them. See them in{" "}
        <Link href="/dashboard/subscriptions" className="underline">
          Subscriptions
        </Link>
        .
      </p>
      {notice && <Alert variant={notice.ok ? "success" : "error"}>{notice.text}</Alert>}

      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Card subscriptions ({card_.length} waiting)</h4>
        <p className="text-sm text-[#85859d]">
          In Lemon Squeezy open My Account, Settings, Migration and submit the intake
          form to copy cards to your Stripe account. Status: waiting for cards in
          Stripe. Once they arrive, preview, then link. First charges land on each
          customer&apos;s original renewal date.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy || card_.length === 0}
            onClick={() =>
              act(async () => {
                const result = await post<LinkResponse>(`${base}/link`, { dryRun: true });
                setPlan(result);
                return `Dry run: ${result.summary.create} ready, ${result.summary.waiting} waiting for cards, ${result.summary.manualReview} need review. Nothing was created.`;
              })
            }
          >
            Preview linking
          </Button>
          <Button
            disabled={busy || !plan || plan.summary.create === 0}
            onClick={() => {
              if (!plan) return;
              const total = money(plan.summary.plannedAmountCents);
              if (!window.confirm(`Create ${plan.summary.create} Stripe subscriptions (${total} per cycle, first charge on each renewal date)?`)) return;
              void act(async () => {
                const result = await post<LinkResponse>(`${base}/link`, { dryRun: false });
                setPlan(null);
                return `Linked ${result.linked.length}. ${result.failed.length ? `${result.failed.length} failed.` : ""}`;
              });
            }}
          >
            Link subscriptions
          </Button>
        </div>
        {plan && (
          <table className="w-full text-xs">
            <tbody>
              {plan.items.map((item) => (
                <tr key={item.recordId} className="border-t border-[#f0f0f4]">
                  <td className="py-1">{item.email}</td>
                  <td>{item.action.replace("_", " ")}</td>
                  <td className="text-[#85859d]">
                    {item.action === "create" && item.amountCents !== undefined && item.firstChargeAt
                      ? `${money(item.amountCents, item.currency)} on ${new Date(item.firstChargeAt * 1000).toISOString().slice(0, 10)}`
                      : item.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="space-y-2 border-t border-[#e8e8ee] pt-4">
        <h4 className="text-sm font-semibold">
          PayPal subscriptions ({paypal.length} waiting, {rows.filter((row) => row.resubscribedAt).length} re-subscribed)
        </h4>
        <p className="text-sm text-[#85859d]">
          PayPal subscriptions cannot migrate. Email each customer a personal link
          that starts billing on their old renewal date.
        </p>
        <Button
          variant="outline"
          disabled={busy || paypal.length === 0}
          onClick={() =>
            act(async () => {
              const result = await post<{ sent: string[]; skipped: unknown[]; failed: string[] }>(
                `${base}/resubscribe`,
                {},
              );
              return `Sent ${result.sent.length}, skipped ${result.skipped.length}, failed ${result.failed.length}.`;
            })
          }
        >
          Send re-subscribe emails
        </Button>
      </div>

      <div className="space-y-2 border-t border-[#e8e8ee] pt-4">
        <h4 className="text-sm font-semibold">
          Cancel on Lemon Squeezy ({cancellable.length} ready)
        </h4>
        <p className="text-sm text-[#85859d]">
          Only subscriptions that now bill through Paymug are listed. Cancelling ends
          the Lemon Squeezy copy; your key is used for this request only.
        </p>
        {cancellable.length > 0 && (
          <>
            <Input
              label="Lemon Squeezy API key"
              type="password"
              autoComplete="off"
              value={lsKey}
              onChange={(event) => setLsKey(event.target.value)}
            />
            <ul className="space-y-1 text-sm">
              {cancellable.map((row) => (
                <li key={row.id} className="flex items-center justify-between">
                  <span>
                    {row.email} · {row.product}
                  </span>
                  <Button
                    variant="outline"
                    disabled={busy || lsKey.trim().length < 20}
                    onClick={() => {
                      if (!window.confirm(`Cancel ${row.email}'s subscription on Lemon Squeezy?`)) return;
                      void act(async () => {
                        const result = await post<{ cancelled: string[]; failed: Array<{ message: string }> }>(
                          `${base}/cancel`,
                          { apiKey: lsKey, recordIds: [row.id] },
                        );
                        return result.cancelled.length
                          ? "Cancelled on Lemon Squeezy."
                          : result.failed[0]?.message || "Not cancelled.";
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
