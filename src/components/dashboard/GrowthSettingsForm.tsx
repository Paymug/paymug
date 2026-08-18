"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Input, Select } from "@/components/ui";
import type {
  AffiliateAttributionModel,
  AffiliateCommissionDuration,
  AffiliateCommissionType,
} from "@/lib/types";
import type {
  GrowthSettingsFormProps,
  GrowthSettingsResponse,
} from "./GrowthSettingsForm.types";

export function GrowthSettingsForm({
  storeId,
  initialAffiliatesEnabled,
  initialAffiliateCommissionType,
  initialAffiliateCommissionValue,
  initialAffiliateCommissionDuration,
  initialAffiliateAttributionModel,
  initialEmailCampaignsEnabled,
}: GrowthSettingsFormProps) {
  const router = useRouter();
  const [affiliatesEnabled, setAffiliatesEnabled] = useState(
    initialAffiliatesEnabled
  );
  const [commissionType, setCommissionType] =
    useState<AffiliateCommissionType>(initialAffiliateCommissionType);
  const [commissionValue, setCommissionValue] = useState(
    String(initialAffiliateCommissionValue)
  );
  const [commissionDuration, setCommissionDuration] =
    useState<AffiliateCommissionDuration>(initialAffiliateCommissionDuration);
  const [attributionModel, setAttributionModel] =
    useState<AffiliateAttributionModel>(initialAffiliateAttributionModel);
  const [emailCampaignsEnabled, setEmailCampaignsEnabled] = useState(
    initialEmailCampaignsEnabled
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const response = await fetch("/api/settings/growth", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          affiliatesEnabled,
          affiliateCommissionType: commissionType,
          affiliateCommissionValue: Number(commissionValue),
          affiliateCommissionDuration: commissionDuration,
          affiliateAttributionModel: attributionModel,
          emailCampaignsEnabled,
        }),
      });
      const data = (await response.json()) as GrowthSettingsResponse;
      if (!response.ok) throw new Error(data.error || "Could not save settings");
      setSuccess(true);
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save settings"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-8 space-y-8">
      <section className="overflow-hidden rounded-2xl border border-[#e8e8ee] bg-white">
        <div className="flex items-start justify-between gap-5 px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-[#333]">Affiliates</h2>
            <p className="mt-1 text-sm leading-relaxed text-[#85859d]">
              Track referred orders and calculate commissions automatically.
            </p>
          </div>
          <label className="relative mt-0.5 inline-flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={affiliatesEnabled}
              onChange={(event) => setAffiliatesEnabled(event.target.checked)}
              aria-label="Enable affiliates"
            />
            <span className="h-6 w-11 rounded-full bg-[#d9d9e1] transition peer-checked:bg-accent peer-focus-visible:ring-3 peer-focus-visible:ring-accent/30 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
          </label>
        </div>

        {affiliatesEnabled && (
          <div className="space-y-4 border-t border-[#ededf2] bg-[#fcfcfd] px-5 py-5 sm:px-6">
            <Select
              label="Commission type"
              name="affiliateCommissionType"
              value={commissionType}
              options={[
                { label: "Percentage", value: "percentage" },
                { label: "Fixed amount", value: "fixed" },
              ]}
              onValueChange={(value) =>
                setCommissionType(value as AffiliateCommissionType)
              }
            />
            <Input
              label={
                commissionType === "percentage"
                  ? "Commission rate (%)"
                  : "Fixed commission amount"
              }
              name="affiliateCommissionValue"
              type="number"
              min="0"
              max={commissionType === "percentage" ? "100" : undefined}
              step="0.01"
              value={commissionValue}
              onChange={(event) => setCommissionValue(event.target.value)}
              required
            />
            <Select
              label="Commission duration"
              name="affiliateCommissionDuration"
              value={commissionDuration}
              options={[
                { label: "One-time", value: "one_time" },
                { label: "Recurring", value: "recurring" },
              ]}
              onValueChange={(value) =>
                setCommissionDuration(value as AffiliateCommissionDuration)
              }
            />
            <Select
              label="Referral attribution"
              name="affiliateAttributionModel"
              value={attributionModel}
              options={[
                { label: "Last affiliate visit", value: "last_click" },
                { label: "First affiliate visit", value: "first_click" },
              ]}
              onValueChange={(value) =>
                setAttributionModel(value as AffiliateAttributionModel)
              }
            />
            <p className="text-sm leading-relaxed text-[#85859d]">
              Fixed commissions use the order currency. One-time commissions
              reward the first referred purchase; recurring commissions reward
              subsequent attributed purchases too.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#e8e8ee] bg-white px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-5">
          <div>
            <h2 className="text-base font-semibold text-[#333]">
              Email campaigns
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[#85859d]">
              Create and send campaigns to your subscribed audience.
            </p>
          </div>
          <label className="relative mt-0.5 inline-flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={emailCampaignsEnabled}
              onChange={(event) =>
                setEmailCampaignsEnabled(event.target.checked)
              }
              aria-label="Enable email campaigns"
            />
            <span className="h-6 w-11 rounded-full bg-[#d9d9e1] transition peer-checked:bg-accent peer-focus-visible:ring-3 peer-focus-visible:ring-accent/30 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
          </label>
        </div>
      </section>

      {error && <Alert>{error}</Alert>}
      {success && <Alert variant="success">Growth settings saved.</Alert>}
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
