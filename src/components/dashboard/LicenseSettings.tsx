"use client";

import { ArrowSquareOut, Check, Crown, Key, Warning } from "@phosphor-icons/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Input } from "@/components/ui";
import {
  proFeatureLabels,
  proFeatures,
  proPurchaseUrl,
} from "@/lib/app-license.config";
import type {
  AppLicenseApiResponse,
  AppLicenseStatus,
} from "@/lib/app-license.types";
import type { LicenseSettingsProps } from "./LicenseSettings.types";

export function LicenseSettings({ initialLicense }: LicenseSettingsProps) {
  const router = useRouter();
  const [license, setLicense] = useState(initialLicense);
  const [licenseKey, setLicenseKey] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function updateLicense(
    method: "POST" | "DELETE",
  ): Promise<AppLicenseStatus | undefined> {
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/license", {
        method,
        headers: { "Content-Type": "application/json" },
        body:
          method === "POST" ? JSON.stringify({ licenseKey }) : undefined,
      });
      const result = (await response.json()) as AppLicenseApiResponse;
      if (!response.ok || !result.license) {
        throw new Error(result.error || "Could not update license");
      }
      setLicense(result.license);
      setLicenseKey("");
      router.refresh();
      return result.license;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update license",
      );
      return undefined;
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-[#e8e8ee] bg-white">
        <div className="flex items-start gap-4 border-b border-[#e8e8ee] px-5 py-5 sm:px-6">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-[#8a6800]">
            <Crown size={22} weight="fill" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">
              {license.pro ? "Paymug Pro" : "Paymug Free"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              {license.pro
                ? `License ${license.licenseKeyPrefix || "active"} is active on this installation.`
                : "Activate a Paymug Pro license to unlock every growth feature."}
            </p>
          </div>
          <span
            className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${
              license.pro
                ? "bg-emerald-50 text-emerald-700"
                : "bg-[#f4f4f7] text-[#74748f]"
            }`}
          >
            {license.pro ? "Active" : "Free"}
          </span>
        </div>

        <div className="px-5 py-5 sm:px-6">
          {license.pro ? (
            <div className="flex flex-wrap gap-3">
              {license.manageUrl && (
                <a
                  href={license.manageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-dark"
                >
                  Manage license
                </a>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={working}
                onClick={() => void updateLicense("DELETE")}
              >
                Deactivate
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-accent/40 bg-accent-soft p-4">
                <p className="text-sm font-semibold text-foreground">
                  Don’t have a Paymug Pro license yet?
                </p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Purchase Pro, then return here to activate your license key.
                </p>
                <a
                  href={proPurchaseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-dark hover:bg-accent-hover"
                >
                  Get Paymug Pro
                  <ArrowSquareOut size={15} />
                </a>
              </div>
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void updateLicense("POST");
                }}
              >
                <Input
                  label="License key"
                  value={licenseKey}
                  onChange={(event) => setLicenseKey(event.target.value)}
                  placeholder="Enter your Paymug Pro license key"
                  required
                />
                <Button type="submit" disabled={working}>
                  <Key size={16} />
                  {working ? "Activating…" : "Activate Pro"}
                </Button>
              </form>
            </div>
          )}
          {error && <div className="mt-4"><Alert>{error}</Alert></div>}
          {license.validationError && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              <Warning size={17} className="mt-0.5 shrink-0" />
              {license.validationError}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[#e8e8ee] bg-white p-5 sm:p-6">
        <h2 className="font-semibold">Included with Pro</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {proFeatures.map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-sm">
              <Check size={16} className="text-emerald-600" weight="bold" />
              {proFeatureLabels[feature]}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
