"use client";

import {
  ArrowClockwise,
  ArrowSquareOut,
  Check,
  DownloadSimple,
  UploadSimple,
  Warning,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button } from "@/components/ui";
import type {
  AboutPanelProps,
  AboutUpdateResponse,
} from "./AboutPanel.types";
import {
  downloadAboutBackup,
  uploadAboutBackup,
} from "./about-backup.utils";

export function AboutPanel({ status }: AboutPanelProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [update, setUpdate] = useState<AboutUpdateResponse | null>(null);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [preserveIds, setPreserveIds] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{
    variant: "error" | "success" | "info";
    text: string;
  } | null>(null);
  const missing = status.configurations.filter((item) => !item.configured);
  const missingRequired = missing.filter((item) => item.required);

  async function checkForUpdate() {
    setChecking(true);
    setUpdate(null);
    try {
      const response = await fetch("/api/about/update", { cache: "no-store" });
      const data = (await response.json()) as AboutUpdateResponse;
      if (!response.ok) throw new Error(data.error || "Could not check for updates");
      setUpdate(data);
    } catch (error) {
      setUpdate({
        error: error instanceof Error ? error.message : "Could not check for updates",
      });
    } finally {
      setChecking(false);
    }
  }

  async function exportBackup() {
    setExporting(true);
    setBackupMessage(null);
    try {
      await downloadAboutBackup();
      setBackupMessage({ variant: "success", text: "Store backup downloaded." });
    } catch (error) {
      setBackupMessage({
        variant: "error",
        text: error instanceof Error ? error.message : "Could not export store data",
      });
    } finally {
      setExporting(false);
    }
  }

  async function importBackup() {
    if (!backupFile) return;
    if (
      preserveIds &&
      !window.confirm(
        "Preserving IDs will update existing records that have matching IDs. Continue?",
      )
    ) {
      return;
    }
    setImporting(true);
    setBackupMessage(null);
    try {
      const result = await uploadAboutBackup(backupFile, preserveIds);
      setBackupMessage({
        variant: "success",
        text: `Imported ${result.stores || 0} stores, ${result.products || 0} products, ${result.orders || 0} orders, ${result.featureRecords || 0} feature records, and ${result.customers || 0} customer accounts${result.reusedCustomers ? ` (${result.reusedCustomers} existing customers reused)` : ""}.`,
      });
      router.refresh();
    } catch (error) {
      setBackupMessage({
        variant: "error",
        text: error instanceof Error ? error.message : "Could not import backup",
      });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#e8e8ee] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-semibold">Paymug version</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
              v{status.version}
            </p>
          </div>
          <Button type="button" onClick={() => void checkForUpdate()} disabled={checking}>
            <ArrowClockwise size={16} className={checking ? "animate-spin" : ""} />
            {checking ? "Checking…" : "Check for update"}
          </Button>
        </div>

        {update?.error && <div className="mt-5"><Alert>{update.error}</Alert></div>}
        {update?.latestVersion && (
          <div
            className={`mt-5 rounded-xl border p-4 ${
              update.isLatest
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex items-start gap-3">
              {update.isLatest ? (
                <Check size={20} className="mt-0.5 shrink-0 text-emerald-700" />
              ) : (
                <Warning size={20} className="mt-0.5 shrink-0 text-amber-700" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {update.isLatest
                    ? "Paymug is up to date"
                    : "A newer Paymug version is available"}
                </p>
                <p className="mt-1 text-sm leading-6 text-[#696978]">
                  {update.isLatest
                    ? `This deployment is running the latest version, v${update.currentVersion}.`
                    : `Latest version: v${update.latestVersion}. You are currently running v${update.currentVersion}.`}
                </p>
                {!update.isLatest && update.workflowUrl && (
                  <a
                    href={update.workflowUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-dark transition hover:bg-accent-hover"
                  >
                    Open update workflow <ArrowSquareOut size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e8e8ee] bg-white">
        <div className="border-b border-[#e8e8ee] px-5 py-5 sm:px-6">
          <h3 className="font-semibold">Store data backup</h3>
          <p className="mt-1 text-sm leading-6 text-[#85859d]">
            Export or import every store, product, order, customer, page, campaign,
            subscription, discount, affiliate record, and store setting.
          </p>
        </div>
        <div className="grid gap-0 md:grid-cols-2">
          <div className="border-b border-[#e8e8ee] p-5 sm:p-6 md:border-b-0 md:border-r">
            <p className="text-sm font-semibold">Export data</p>
            <p className="mt-2 text-sm leading-6 text-[#85859d]">
              Downloads a portable JSON backup. Payment credentials, API keys,
              access tokens, and app-license secrets are excluded. The file contains
              customer personal data and password hashes, so store it securely.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              disabled={exporting}
              onClick={() => void exportBackup()}
            >
              <DownloadSimple size={16} />
              {exporting ? "Exporting…" : "Download backup"}
            </Button>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-sm font-semibold">Import data</p>
            <p className="mt-2 text-sm leading-6 text-[#85859d]">
              Product file metadata and URLs are preserved, but R2 file binaries
              are not embedded in the JSON backup.
            </p>
            <label className="mt-4 block text-sm font-medium text-[#3f3f49]">
              Backup file
              <input
                type="file"
                accept="application/json,.json"
                className="mt-2 block w-full rounded-xl border border-[#dedee6] bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#f4f4f7] file:px-3 file:py-2 file:text-sm file:font-semibold"
                onChange={(event) => setBackupFile(event.target.files?.[0] || null)}
              />
            </label>
            <label className="mt-4 flex items-start gap-3 text-sm text-[#696978]">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-[#cfcfd8]"
                checked={preserveIds}
                onChange={(event) => setPreserveIds(event.target.checked)}
              />
              <span>
                <span className="block font-semibold text-[#3f3f49]">Preserve IDs</span>
                Restore records with their original IDs and update matching IDs.
                Leave this off to create independent copies with remapped IDs and slugs.
              </span>
            </label>
            <Button
              type="button"
              className="mt-4"
              disabled={!backupFile || importing}
              onClick={() => void importBackup()}
            >
              <UploadSimple size={16} />
              {importing ? "Importing…" : "Import backup"}
            </Button>
          </div>
        </div>
        {backupMessage && (
          <div className="border-t border-[#e8e8ee] p-5 sm:px-6">
            <Alert variant={backupMessage.variant}>{backupMessage.text}</Alert>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e8e8ee] bg-white">
        <div className="border-b border-[#e8e8ee] px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">Configuration</h3>
              <p className="mt-1 text-sm text-[#85859d]">
                Secret values are never displayed—only whether they are available.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                missingRequired.length
                  ? "bg-red-50 text-red-700"
                  : missing.length
                    ? "bg-amber-50 text-amber-700"
                    : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {missing.length ? `${missing.length} missing` : "All configured"}
            </span>
          </div>
        </div>
        <div>
          {status.configurations.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-4 border-b border-[#eeeeF2] px-5 py-4 last:border-0 sm:px-6 ${
                item.configured ? "" : "bg-[#fffdf7]"
              }`}
            >
              <span
                className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                  item.configured
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {item.configured ? <Check size={15} /> : <Warning size={15} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="text-sm font-semibold text-[#3f3f49]">{item.label}</code>
                  {!item.required && (
                    <span className="rounded-full bg-[#f4f4f7] px-2 py-0.5 text-[11px] font-medium text-[#85859d]">
                      Optional
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm leading-6 text-[#85859d]">{item.description}</p>
              </div>
              <span className={`shrink-0 text-xs font-semibold ${item.configured ? "text-emerald-700" : "text-amber-700"}`}>
                {item.configured ? "Configured" : "Missing"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
