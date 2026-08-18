"use client";

import {
  ArrowClockwise,
  ArrowSquareOut,
  Check,
  GitBranch,
  Warning,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Alert, Button } from "@/components/ui";
import type {
  AboutPanelProps,
  AboutUpdateResponse,
} from "./AboutPanel.types";

export function AboutPanel({ status }: AboutPanelProps) {
  const [checking, setChecking] = useState(false);
  const [update, setUpdate] = useState<AboutUpdateResponse | null>(null);
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

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#e8e8ee] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-semibold">Paymug version</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
              v{status.version}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#85859d]">
              <span className="flex items-center gap-1.5">
                <GitBranch size={14} />
                {status.commitSha
                  ? status.commitSha.slice(0, 12)
                  : "Commit not recorded"}
              </span>
              {status.repository && <span>{status.repository}</span>}
            </div>
          </div>
          <Button type="button" onClick={() => void checkForUpdate()} disabled={checking}>
            <ArrowClockwise size={16} className={checking ? "animate-spin" : ""} />
            {checking ? "Checking…" : "Check for update"}
          </Button>
        </div>

        {update?.error && <div className="mt-5"><Alert>{update.error}</Alert></div>}
        {update?.latestSha && (
          <div
            className={`mt-5 rounded-xl border p-4 ${
              update.updateAvailable
                ? "border-amber-200 bg-amber-50"
                : "border-emerald-200 bg-emerald-50"
            }`}
          >
            <div className="flex items-start gap-3">
              {update.updateAvailable ? (
                <Warning size={20} className="mt-0.5 shrink-0 text-amber-700" />
              ) : (
                <Check size={20} className="mt-0.5 shrink-0 text-emerald-700" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {update.updateAvailable
                    ? "A newer Paymug update is available"
                    : "Paymug is up to date"}
                </p>
                <p className="mt-1 text-sm leading-6 text-[#696978]">
                  Latest Paymug version: v{update.latestVersion}. Upstream
                  commit: {update.latestSha.slice(0, 12)}.
                  {update.updateAvailable
                    ? " The automatic sync workflow will merge and deploy it on its next run."
                    : " This deployment matches the private upstream."}
                </p>
                {update.latestCommitUrl && (
                  <a
                    href={update.latestCommitUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#8a6800] hover:underline"
                  >
                    View commit <ArrowSquareOut size={14} />
                  </a>
                )}
                {update.updateAvailable && update.workflowUrl && (
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
