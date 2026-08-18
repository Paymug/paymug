"use client";

import { useState } from "react";
import { Alert } from "@/components/ui";
import type { AbandonedCheckoutAutomationProps } from "./AbandonedCheckoutAutomation.types";

export function AbandonedCheckoutAutomation({
  initialEnabled,
}: AbandonedCheckoutAutomationProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function toggle(nextEnabled: boolean) {
    setEnabled(nextEnabled);
    setSaving(true);
    setError("");
    const response = await fetch("/api/settings/automations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: nextEnabled }),
    });
    setSaving(false);
    if (!response.ok) {
      const result = (await response.json()) as { error?: string };
      setEnabled(!nextEnabled);
      setError(result.error || "Could not update automation");
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-[#e8e8ee] bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="font-semibold">Abandoned checkout reminder</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Email a signed-in customer one hour after they view a product and
            leave without completing payment.
          </p>
        </div>
        <label className="relative inline-flex shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={enabled}
            disabled={saving}
            onChange={(event) => void toggle(event.target.checked)}
            aria-label="Enable abandoned checkout reminders"
          />
          <span className="h-6 w-11 rounded-full bg-[#d9d9e1] transition peer-checked:bg-accent peer-disabled:opacity-50 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
        </label>
      </div>
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
    </div>
  );
}
