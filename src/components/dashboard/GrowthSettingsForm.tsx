"use client";

import { Lock, Plus, Trash } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Input, Select } from "@/components/ui";
import {
  DEFAULT_ABANDONMENT_OPTIONS,
  DEFAULT_ABANDONMENT_QUESTION,
} from "@/lib/abandonment";
import type {
  AffiliateAttributionModel,
  AffiliateCommissionDuration,
  AffiliateCommissionType,
} from "@/lib/types";
import type {
  GrowthSettingsFormProps,
  GrowthSettingsResponse,
} from "./GrowthSettingsForm.types";

function ProLockBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8a6800]">
      <Lock size={11} weight="fill" aria-hidden /> Pro
    </span>
  );
}

export function GrowthSettingsForm({
  storeId,
  initialAffiliatesEnabled,
  initialAffiliateCommissionType,
  initialAffiliateCommissionValue,
  initialAffiliateCommissionDuration,
  initialAffiliateAttributionModel,
  initialEmailCampaignsEnabled,
  initialAnalyticsEnabled,
  initialDisplayPurchasesEnabled,
  initialAbandonmentPopupEnabled,
  initialAbandonmentQuestion,
  initialAbandonmentOptions,
  affiliatesUnlocked,
  emailCampaignsUnlocked,
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
  const [analyticsEnabled, setAnalyticsEnabled] = useState(
    initialAnalyticsEnabled
  );
  const [displayPurchasesEnabled, setDisplayPurchasesEnabled] = useState(
    initialDisplayPurchasesEnabled
  );
  const [abandonmentPopupEnabled, setAbandonmentPopupEnabled] = useState(
    initialAbandonmentPopupEnabled
  );
  const [abandonmentQuestion, setAbandonmentQuestion] = useState(
    initialAbandonmentQuestion
  );
  const [abandonmentOptions, setAbandonmentOptions] = useState<string[]>(
    initialAbandonmentOptions
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
          analyticsEnabled,
          displayPurchasesEnabled,
          abandonmentPopupEnabled,
          abandonmentQuestion: abandonmentQuestion.trim() || null,
          abandonmentOptions: abandonmentOptions
            .map((option) => option.trim())
            .filter(Boolean),
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
            <h2 className="flex items-center gap-2 text-base font-semibold text-[#333]">
              Affiliates
              {!affiliatesUnlocked && <ProLockBadge />}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[#85859d]">
              Track referred orders and calculate commissions automatically.
            </p>
          </div>
          <label
            className={`relative mt-0.5 inline-flex shrink-0 items-center ${
              affiliatesUnlocked
                ? "cursor-pointer"
                : "cursor-not-allowed opacity-50"
            }`}
          >
            <input
              type="checkbox"
              className="peer sr-only"
              checked={affiliatesEnabled}
              disabled={!affiliatesUnlocked}
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
            <h2 className="flex items-center gap-2 text-base font-semibold text-[#333]">
              Email campaigns
              {!emailCampaignsUnlocked && <ProLockBadge />}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[#85859d]">
              Create and send campaigns to your subscribed audience.
            </p>
          </div>
          <label
            className={`relative mt-0.5 inline-flex shrink-0 items-center ${
              emailCampaignsUnlocked
                ? "cursor-pointer"
                : "cursor-not-allowed opacity-50"
            }`}
          >
            <input
              type="checkbox"
              className="peer sr-only"
              checked={emailCampaignsEnabled}
              disabled={!emailCampaignsUnlocked}
              onChange={(event) =>
                setEmailCampaignsEnabled(event.target.checked)
              }
              aria-label="Enable email campaigns"
            />
            <span className="h-6 w-11 rounded-full bg-[#d9d9e1] transition peer-checked:bg-accent peer-focus-visible:ring-3 peer-focus-visible:ring-accent/30 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e8e8ee] bg-white px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-5">
          <div>
            <h2 className="text-base font-semibold text-[#333]">
              Visitor analytics
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[#85859d]">
              Measure storefront visits, sources, devices, operating systems,
              cities, and countries without storing IP addresses.
            </p>
          </div>
          <label className="relative mt-0.5 inline-flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={analyticsEnabled}
              onChange={(event) => setAnalyticsEnabled(event.target.checked)}
              aria-label="Enable visitor analytics"
            />
            <span className="h-6 w-11 rounded-full bg-[#d9d9e1] transition peer-checked:bg-accent peer-focus-visible:ring-3 peer-focus-visible:ring-accent/30 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e8e8ee] bg-white px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-5">
          <div>
            <h2 className="text-base font-semibold text-[#333]">
              Display purchases
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[#85859d]">
              Show the number of completed purchases on product cards and
              product pages.
            </p>
          </div>
          <label className="relative mt-0.5 inline-flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={displayPurchasesEnabled}
              onChange={(event) =>
                setDisplayPurchasesEnabled(event.target.checked)
              }
              aria-label="Display product purchases"
            />
            <span className="h-6 w-11 rounded-full bg-[#d9d9e1] transition peer-checked:bg-accent peer-focus-visible:ring-3 peer-focus-visible:ring-accent/30 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e8e8ee] bg-white px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-5">
          <div>
            <h2 className="text-base font-semibold text-[#333]">
              Abandonment popup
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[#85859d]">
              Show a one-question survey when a visitor is about to leave
              checkout without completing an order.
            </p>
          </div>
          <label className="relative mt-0.5 inline-flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={abandonmentPopupEnabled}
              onChange={(event) => {
                const checked = event.target.checked;
                setAbandonmentPopupEnabled(checked);
                if (checked && !abandonmentQuestion.trim()) {
                  setAbandonmentQuestion(DEFAULT_ABANDONMENT_QUESTION);
                }
                if (
                  checked &&
                  abandonmentOptions.filter((option) => option.trim()).length ===
                    0
                ) {
                  setAbandonmentOptions(DEFAULT_ABANDONMENT_OPTIONS);
                }
              }}
              aria-label="Enable abandonment popup"
            />
            <span className="h-6 w-11 rounded-full bg-[#d9d9e1] transition peer-checked:bg-accent peer-focus-visible:ring-3 peer-focus-visible:ring-accent/30 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
          </label>
        </div>

        {abandonmentPopupEnabled && (
          <div className="mt-5 space-y-4 border-t border-[#ededf2] pt-5">
            <Input
              label="Question"
              name="abandonmentQuestion"
              value={abandonmentQuestion}
              onChange={(event) => setAbandonmentQuestion(event.target.value)}
              placeholder={DEFAULT_ABANDONMENT_QUESTION}
              maxLength={200}
            />
            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">
                Answer options
              </p>
              <div className="space-y-2">
                {abandonmentOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      name={`abandonmentOption-${index}`}
                      value={option}
                      onChange={(event) =>
                        setAbandonmentOptions((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index
                              ? event.target.value
                              : entry,
                          ),
                        )
                      }
                      placeholder={`Option ${index + 1}`}
                      maxLength={160}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setAbandonmentOptions((current) =>
                          current.filter((_, entryIndex) => entryIndex !== index),
                        )
                      }
                      className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg text-[#85859d] transition hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove option ${index + 1}`}
                    >
                      <Trash size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setAbandonmentOptions((current) => [...current, ""])
                }
                className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-accent-hover hover:underline"
              >
                <Plus size={14} weight="bold" />
                Add option
              </button>
            </div>
            <p className="text-xs leading-5 text-[#85859d]">
              Visitors can also type their own answer. Opted-in emails are
              added to your subscribers.
            </p>
          </div>
        )}
      </section>

      {error && <Alert>{error}</Alert>}
      {success && <Alert variant="success">Growth settings saved.</Alert>}
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
