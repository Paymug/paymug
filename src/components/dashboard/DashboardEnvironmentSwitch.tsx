"use client";

import { WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { PayPalMode } from "@/lib/types";
import type {
  DashboardEnvironmentSwitchProps,
  EnvironmentResponse,
} from "./DashboardEnvironmentSwitch.types";
import {
  getActiveEnvironmentError,
  getNextEnvironment,
  getUnavailableEnvironmentMessage,
} from "./environment-switch.utils";

export function DashboardEnvironmentSwitch({
  environment: initialEnvironment,
  availability,
}: DashboardEnvironmentSwitchProps) {
  const router = useRouter();
  const [environment, setEnvironment] =
    useState<PayPalMode>(initialEnvironment);
  const [error, setError] = useState<string | null>(
    getActiveEnvironmentError(
      initialEnvironment,
      availability[initialEnvironment]
    )
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEnvironment(initialEnvironment);
    setError(
      getActiveEnvironmentError(
        initialEnvironment,
        availability[initialEnvironment]
      )
    );
  }, [availability, initialEnvironment]);

  async function toggleEnvironment() {
    const nextEnvironment = getNextEnvironment(environment);
    setError(null);

    if (!availability[nextEnvironment]) {
      setError(getUnavailableEnvironmentMessage(nextEnvironment));
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/dashboard/environment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ environment: nextEnvironment }),
      });
      const data = (await response.json()) as EnvironmentResponse;

      if (!response.ok) {
        setError(
          data.error || getUnavailableEnvironmentMessage(nextEnvironment)
        );
        return;
      }

      setEnvironment(nextEnvironment);
      router.refresh();
    } catch {
      setError("Could not switch environments. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const isLive = environment === "live";

  return (
    <div className="mx-6 py-2">
      {error && (
        <div
          className="mb-2.5 flex items-start gap-1.5 rounded-lg bg-[#fff0f4] px-2.5 py-2 text-sm leading-snug text-[#c93757]"
          role="alert"
        >
          <WarningCircle size={15} weight="fill" aria-hidden />
          <p>
            {error}{" "}
            <Link
              href="/dashboard/settings/payments"
              className="font-semibold underline underline-offset-2"
            >
              Add credentials
            </Link>
          </p>
        </div>
      )}
      <div className="flex min-h-7 items-center justify-between gap-3 text-sm font-medium text-[#333]">
        <span>{isLive ? "Live mode" : "Test mode"}</span>
        <button
          type="button"
          className={`relative inline-flex h-[1.15rem] w-[2.05rem] min-w-[2.05rem] shrink-0 cursor-pointer rounded-full border-0 p-0 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-65 ${
            isLive ? "bg-accent" : "bg-[#d7d7df]"
          }`}
          role="switch"
          aria-checked={isLive}
          aria-label={isLive ? "Switch to Test mode" : "Switch to Live mode"}
          disabled={saving}
          onClick={toggleEnvironment}
        >
          <span
            className={`absolute left-[0.15rem] top-[0.15rem] h-[0.85rem] w-[0.85rem] rounded-full bg-white shadow-[0_1px_2px_rgb(39_39_47/22%)] transition-transform ${
              isLive ? "translate-x-[0.9rem]" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
