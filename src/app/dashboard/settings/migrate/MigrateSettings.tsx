"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Input, Spinner } from "@/components/ui";
import { dashboardPageClass } from "@/components/dashboard/dashboard.styles";
import {
  migrationSources,
  type MigrationSourceId,
} from "@/lib/migrations/sources";
import { SubscriptionsChecklist } from "./SubscriptionsChecklist";
import type { LsStoreOption, MigrateJob, MigratePreview } from "./page.types";

const resources = [
  { id: "products", label: "Products, variants", locked: true },
  { id: "files", label: "Files" },
  { id: "customers", label: "Customers" },
  { id: "orders", label: "Orders" },
  { id: "licenses", label: "License keys and activations" },
  { id: "discounts", label: "Discounts" },
  { id: "affiliates", label: "Affiliates" },
  { id: "subscriptions", label: "Subscriptions (as pending)" },
] as const;

const previewCountKey: Record<string, string> = {
  products: "products",
  customers: "customers",
  orders: "orders",
  licenses: "licenses",
  discounts: "discounts",
  affiliates: "affiliates",
  subscriptions: "subscriptions",
};

const sourceBlurb: Record<MigrationSourceId, string> = {
  lemonsqueezy: "Stops processing payments on 2027-03-31.",
  polar: "Polar moves saved cards to your Stripe for free.",
  paddle: "Catalog, orders and subscriptions. Cards via Paddle support.",
  dodo: "Catalog, files, license keys and subscriptions.",
};

const goLive: Record<MigrationSourceId, { checkout: string; license: string | null; extra: string[] }> = {
  lemonsqueezy: {
    checkout: "Replace Lemon Squeezy checkout links with Paymug links.",
    license: "/api/compat/lemonsqueezy/v1/licenses/validate",
    extra: [],
  },
  polar: {
    checkout: "Swap Polar checkout links and embeds for Paymug links.",
    license: "/api/compat/polar/v1/customer-portal/license-keys/validate",
    extra: [
      "Polar disables new checkouts while offboarding and holds payouts for 120 days after your last transaction.",
    ],
  },
  paddle: {
    checkout: "Swap Paddle.js and Paddle checkout links for Paymug links.",
    license: null,
    extra: ["Paddle has no license keys, so there is nothing to point a license API at."],
  },
  dodo: {
    checkout: "Swap Dodo checkout links, overlay checkout and short links for Paymug links.",
    license: "/api/compat/dodo/licenses/validate",
    extra: [],
  },
};

const card = "rounded-2xl border border-[#e8e8ee] bg-white px-5 py-5 sm:px-6";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body;
}

export function MigrateSettings() {
  const [source, setSource] = useState<MigrationSourceId>("lemonsqueezy");
  const meta = migrationSources[source];
  const base = `/api/settings/migrate/${source}`;
  const [apiKey, setApiKey] = useState("");
  const [mode, setMode] = useState<"test" | "live">("test");
  const [stores, setStores] = useState<LsStoreOption[]>([]);
  const [lsStoreId, setLsStoreId] = useState("");
  const [preview, setPreview] = useState<MigratePreview | null>(null);
  const [selected, setSelected] = useState<string[]>(resources.map((r) => r.id));
  const visibleResources = resources.filter((r) => (meta.stages as string[]).includes(r.id));
  const [job, setJob] = useState<MigrateJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);

  useEffect(() => {
    setJob(null);
    setStores([]);
    setPreview(null);
    setLsStoreId("");
    setError(null);
    api<{ job: MigrateJob | null }>(`${base}/status`)
      .then((body) => {
        if (body.job) setJob(body.job);
      })
      .catch(() => undefined);
  }, [base]);

  // One chunk per request; the job state lives in the database so it can resume.
  const drive = useCallback(async (id: string) => {
    if (running.current) return;
    running.current = true;
    try {
      for (;;) {
        const body = await api<{ job: MigrateJob }>(`${base}/status?id=${id}`, {
          method: "POST",
        });
        setJob(body.job);
        if (body.job.status !== "running") break;
      }
    } catch (driveError) {
      setError(driveError instanceof Error ? driveError.message : "Import stopped");
    } finally {
      running.current = false;
    }
  }, [base]);

  useEffect(() => {
    if (job?.status === "running") void drive(job.id);
  }, [job?.id, job?.status, drive]);

  async function run<T>(task: () => Promise<T>) {
    setBusy(true);
    setError(null);
    try {
      return await task();
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const connect = () =>
    run(async () => {
      const body = await api<{ stores: LsStoreOption[]; mode?: "test" | "live" }>(`${base}/connect`, {
        method: "POST",
        body: JSON.stringify({ apiKey, mode }),
      });
      if (body.mode) setMode(body.mode);
      setStores(body.stores);
      setLsStoreId(body.stores[0]?.id ?? "");
      setPreview(null);
    });

  const loadPreview = () =>
    run(async () => {
      setPreview(
        await api<MigratePreview>(`${base}/preview`, {
          method: "POST",
          body: JSON.stringify({ apiKey, lsStoreId, mode }),
        }),
      );
    });

  const start = () =>
    run(async () => {
      const body = await api<{ job: MigrateJob }>(`${base}/start`, {
        method: "POST",
        body: JSON.stringify({ apiKey, lsStoreId, mode, stages: selected }),
      });
      setApiKey("");
      setJob(body.job);
    });

  const cancel = () =>
    run(async () => {
      if (!job) return;
      const body = await api<{ job: MigrateJob }>(`${base}/cancel?id=${job.id}`, {
        method: "POST",
      });
      setJob(body.job);
    });

  const active = job && job.status === "running";
  const finished = job && job.status !== "running" && job.status !== "pending";

  return (
    <div className={`${dashboardPageClass} !max-w-3xl pb-12`}>
      <h1 className="sr-only">Migrate</h1>
      <section className="py-8 text-center sm:py-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-hover">
          Migrate
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#333]">
          Move your store to Paymug
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-[#74748f]">
          Free for everyone. Import your catalog, files, customers, orders,
          license keys, discounts and subscriptions in one run.
        </p>
      </section>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Migrate from">
        {(Object.keys(migrationSources) as MigrationSourceId[]).map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={source === id}
            disabled={Boolean(active) && source !== id}
            onClick={() => setSource(id)}
            className={`${card} text-left transition ${
              source === id ? "border-accent" : "hover:border-[#c9c9d6]"
            } disabled:opacity-50`}
          >
            <h3 className="text-base font-semibold text-[#333]">{migrationSources[id].label}</h3>
            <p className="mt-1 text-sm text-[#85859d]">{sourceBlurb[id]}</p>
          </button>
        ))}
      </div>

      {!active && !finished && (
        <section className={`${card} space-y-4`} aria-label="Connect">
          <h3 className="text-base font-semibold text-[#333]">1. Connect</h3>
          <Input
            label={meta.secretLabel}
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
          <p className="text-xs text-[#85859d]">
            Held encrypted only while the import runs, then deleted.{" "}
            {meta.modeFromKey
              ? "Test keys import into your sandbox, live keys into live (detected from the key)."
              : "Test or sandbox keys import into your sandbox, live keys into live."}
          </p>
          <div className={`flex gap-4 text-sm ${meta.modeFromKey ? "hidden" : ""}`}>
            {(["test", "live"] as const).map((value) => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="migrate-mode"
                  checked={mode === value}
                  onChange={() => setMode(value)}
                />
                {value === "test" ? "Test mode (sandbox)" : "Live mode"}
              </label>
            ))}
          </div>
          <Button onClick={connect} disabled={busy || apiKey.trim().length < 8}>
            {busy && !stores.length ? <Spinner className="h-4 w-4" /> : null}
            Connect
          </Button>

          {stores.length > 0 && (
            <div className="space-y-3 border-t border-[#e8e8ee] pt-4">
              <label className="block text-sm font-medium text-[#333]" htmlFor="ls-store">
                {source === "polar" ? "Polar organization" : `${meta.label} store`}
              </label>
              <select
                id="ls-store"
                className="w-full rounded-lg border border-[#e8e8ee] px-3 py-2 text-sm"
                value={lsStoreId}
                onChange={(event) => {
                  setLsStoreId(event.target.value);
                  setPreview(null);
                }}
              >
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                    {store.currency ? ` (${store.currency})` : ""}
                  </option>
                ))}
              </select>
              <Button variant="outline" onClick={loadPreview} disabled={busy || !lsStoreId}>
                Preview import
              </Button>
            </div>
          )}
        </section>
      )}

      {preview && !active && !finished && (
        <section className={`${card} mt-6 space-y-4`} aria-label="Preview">
          <h3 className="text-base font-semibold text-[#333]">2. Preview</h3>
          <p className="text-sm text-[#85859d]">
            Imports into your <strong>{preview.environment}</strong> environment
            for the active store. Nothing is overwritten; re-running is safe.
          </p>
          <ul className="space-y-2">
            {visibleResources.map((resource) => (
              <li key={resource.id} className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(resource.id)}
                    disabled={"locked" in resource}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, resource.id]
                          : current.filter((id) => id !== resource.id),
                      )
                    }
                  />
                  {resource.label}
                </label>
                <span className="text-[#85859d]">
                  {previewCountKey[resource.id] !== undefined
                    ? preview.counts[previewCountKey[resource.id]]
                    : "-"}
                </span>
              </li>
            ))}
          </ul>
          {(preview.notes ?? meta.notes).length > 0 && (
            <Alert variant="info">{(preview.notes ?? meta.notes).join(" ")}</Alert>
          )}
          {preview.alreadyImportedProducts > 0 && (
            <Alert variant="info">
              {preview.alreadyImportedProducts} products were imported before and
              will be skipped.
            </Alert>
          )}
          {(preview.conflicts.productSlugs.length > 0 ||
            preview.conflicts.discountCodes.length > 0) && (
            <Alert variant="info">
              {preview.conflicts.productSlugs.length > 0 &&
                `Product slugs already used (a suffix will be added): ${preview.conflicts.productSlugs.join(", ")}. `}
              {preview.conflicts.discountCodes.length > 0 &&
                `Discount codes that already exist are skipped: ${preview.conflicts.discountCodes.join(", ")}.`}
            </Alert>
          )}
          <Button onClick={start} disabled={busy}>
            Import
          </Button>
        </section>
      )}

      {job && (active || finished) && (
        <section className={`${card} space-y-4`} aria-label="Import progress">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#333]">
              {active ? "3. Importing" : "4. Report"}
            </h3>
            {active && (
              <Button variant="outline" onClick={cancel} disabled={busy}>
                Cancel
              </Button>
            )}
          </div>
          {active && (
            <p className="flex items-center gap-2 text-sm text-[#85859d]">
              <Spinner className="h-4 w-4" /> Working on {job.stage}. You can
              leave; reopen this page to continue.
            </p>
          )}
          {job.status === "failed" && <Alert>Import failed. See errors below, then re-run.</Alert>}
          {job.status === "cancelled" && <Alert variant="info">Import cancelled.</Alert>}
          {job.status === "completed" && <Alert variant="success">Import complete.</Alert>}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#85859d]">
                <th className="py-1 font-medium">Resource</th>
                <th className="py-1 font-medium">Imported</th>
                <th className="py-1 font-medium">Skipped</th>
                <th className="py-1 font-medium">Failed</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(job.counts).map(([stage, c]) => (
                <tr key={stage} className="border-t border-[#f0f0f4]">
                  <td className="py-1 capitalize">{stage}</td>
                  <td>{c.imported}</td>
                  <td>{c.skipped}</td>
                  <td>{c.failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {job.errors.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">
                {job.errorCount} issues
              </summary>
              <ul className="mt-2 space-y-1 text-[#85859d]">
                {job.errors.map((entry, index) => (
                  <li key={index}>
                    {entry.stage} {entry.sourceId}: {entry.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {finished && (
            <div className="flex flex-wrap gap-3">
              <a
                className="text-sm font-semibold text-accent-hover underline"
                href={`${base}/report.csv?id=${job.id}`}
              >
                Download failures CSV
              </a>
              <a
                className="text-sm font-semibold text-accent-hover underline"
                href={`${base}/id-map.csv?id=${job.id}`}
              >
                Download ID mapping
              </a>
              <Button variant="outline" onClick={() => setJob(null)}>
                Run again
              </Button>
            </div>
          )}
        </section>
      )}

      <SubscriptionsChecklist source={source} refreshKey={job?.status ?? "none"} />

      {job?.status === "completed" && (
        <>
          <section className={`${card} mt-6 space-y-3`} aria-label="Go-live checklist">
            <h3 className="text-base font-semibold text-[#333]">Go-live checklist</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm text-[#555]">
              <li>{goLive[source].checkout}</li>
              {goLive[source].license && (
                <li>
                  Point license validation at <code>{goLive[source].license}</code>. See
                  the license activation docs.
                </li>
              )}
              {goLive[source].extra.map((line) => (
                <li key={line}>{line}</li>
              ))}
              <li>Switch webhooks to Paymug in Settings, Webhooks.</li>
              <li>
                Paymug is not a merchant of record, so tax is yours to collect and remit. Review{" "}
                <Link href="/dashboard/settings/tax" className="underline">
                  Settings, Tax
                </Link>
                .
              </li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
