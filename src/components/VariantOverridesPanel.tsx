"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Input } from "./ui";
import type { ProductVariantRecord } from "@/lib/product-variants";
import type { ProductFile } from "@/lib/product-files.types";

type SectionKey = "pwyw" | "billing" | "license" | "delivery" | "github" | "files";

const sectionFields: Record<SectionKey, Array<keyof ProductVariantRecord>> = {
  pwyw: ["customAmountEnabled", "minPrice", "suggestedPrice"],
  billing: ["billingType", "intervalUnit", "intervalCount", "trialDays"],
  license: [
    "generateLicense",
    "licenseType",
    "licenseSeatLimit",
    "licenseUpdatePeriodUnit",
    "licenseUpdatePeriodCount",
  ],
  delivery: ["deliveryContent", "redirectUrl"],
  github: ["githubRepoOwner", "githubRepoName"],
  files: ["productFiles"],
};

const sectionTitles: Record<SectionKey, string> = {
  pwyw: "Pay what you want",
  billing: "Billing and trial",
  license: "License",
  delivery: "Delivery message and redirect",
  github: "GitHub repository access",
  files: "Files",
};

const field =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm";

function isOverridden(variant: ProductVariantRecord, section: SectionKey) {
  return sectionFields[section].some(
    (key) => variant[key] !== undefined && variant[key] !== null,
  );
}

/** Per-section "override the product default" editor for one variant. */
export function VariantOverridesPanel({
  productId,
  variantId,
  currency,
}: {
  productId: string;
  variantId: string;
  currency: string;
}) {
  const base = `/api/products/${productId}/variants`;
  const [variant, setVariant] = useState<ProductVariantRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(base);
    if (!response.ok) return;
    const body = (await response.json()) as { variants: ProductVariantRecord[] };
    setVariant(body.variants.find((item) => item.id === variantId) ?? null);
    setLoaded(true);
  }, [base, variantId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  if (!open) {
    return (
      <button
        type="button"
        className="text-left text-xs font-semibold text-accent-hover underline"
        onClick={() => setOpen(true)}
      >
        Variant overrides
      </button>
    );
  }
  if (!variant) {
    return (
      <p className="text-xs text-muted">
        {loaded ? "Save the product first, then reopen overrides." : "Loading variant..."}
      </p>
    );
  }

  const patch = (changes: Partial<ProductVariantRecord>) =>
    setVariant({ ...variant, ...changes });

  function toggle(section: SectionKey, on: boolean) {
    if (!variant) return;
    const next: Partial<ProductVariantRecord> = {};
    for (const key of sectionFields[section]) {
      (next as Record<string, unknown>)[key] = undefined;
    }
    if (on) {
      if (section === "pwyw") next.customAmountEnabled = true;
      if (section === "billing") {
        next.billingType = "subscription";
        next.intervalUnit = "month";
        next.intervalCount = 1;
        next.trialDays = 0;
      }
      if (section === "license") {
        next.generateLicense = true;
        next.licenseType = "standard";
        next.licenseSeatLimit = 1;
      }
      if (section === "delivery") next.deliveryContent = "";
      if (section === "github") {
        next.githubRepoOwner = "";
        next.githubRepoName = "";
      }
      if (section === "files") next.productFiles = [];
    }
    patch(next);
  }

  async function upload(file: File) {
    const form = new FormData();
    form.set("file", file);
    form.set("kind", "delivery");
    const response = await fetch("/api/product-files", { method: "POST", body: form });
    const body = (await response.json()) as { file?: ProductFile; error?: string };
    if (!response.ok || !body.file) {
      setMessage({ ok: false, text: body.error || "Upload failed" });
      return;
    }
    patch({ productFiles: [...(variant?.productFiles ?? []), body.file] });
  }

  async function save() {
    if (!variant) return;
    setSaving(true);
    setMessage(null);
    const payload: Record<string, unknown> = {
      description: variant.description,
      status: variant.status,
    };
    for (const section of Object.keys(sectionFields) as SectionKey[]) {
      const on = isOverridden(variant, section);
      for (const key of sectionFields[section]) {
        if (key === "licenseSeatLimit") continue;
        payload[key] = on ? (variant[key] ?? null) : null;
      }
    }
    // Seat limit: omitted section inherits; `null` while overriding is unlimited.
    if (isOverridden(variant, "license")) {
      payload.licenseSeatLimit = variant.licenseSeatLimit ?? null;
    } else {
      payload.inheritLicenseSeatLimit = true;
    }
    try {
      const response = await fetch(`${base}/${variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { variant?: ProductVariantRecord; error?: string };
      if (!response.ok || !body.variant) throw new Error(body.error || "Could not save");
      setVariant(body.variant);
      setMessage({ ok: true, text: "Saved" });
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Could not save" });
    } finally {
      setSaving(false);
    }
  }

  const cents = (value: number | null | undefined) =>
    value === null || value === undefined ? "" : (value / 100).toFixed(2);
  const toCents = (value: string) =>
    value === "" ? null : Math.max(0, Math.round(Number(value) * 100));

  return (
    <div className="space-y-3 rounded-lg border border-border bg-[#fafafd] p-3 text-sm">
      <p className="text-xs text-muted">
        Turn a section on to override the product&apos;s value for this variant.
        Sections that are off use the product&apos;s settings.
      </p>
      {(Object.keys(sectionFields) as SectionKey[]).map((section) => {
        const on = isOverridden(variant, section);
        return (
          <div key={section} className="space-y-2 border-t border-border pt-2">
            <label className="flex items-center gap-2 font-medium">
              <input
                type="checkbox"
                checked={on}
                onChange={(event) => toggle(section, event.target.checked)}
              />
              {sectionTitles[section]}
            </label>
            {on && section === "pwyw" && (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label={`Minimum (${currency})`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={cents(variant.minPrice)}
                  onChange={(event) => patch({ minPrice: toCents(event.target.value) })}
                />
                <Input
                  label={`Suggested (${currency})`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={cents(variant.suggestedPrice)}
                  onChange={(event) => patch({ suggestedPrice: toCents(event.target.value) })}
                />
              </div>
            )}
            {on && section === "billing" && (
              <div className="grid grid-cols-2 gap-2">
                <select
                  aria-label="Billing type"
                  className={field}
                  value={variant.billingType ?? "one_time"}
                  onChange={(event) =>
                    patch({ billingType: event.target.value as "one_time" | "subscription" })
                  }
                >
                  <option value="one_time">One time</option>
                  <option value="subscription">Subscription</option>
                </select>
                <select
                  aria-label="Interval"
                  className={field}
                  value={variant.intervalUnit ?? "month"}
                  onChange={(event) =>
                    patch({ intervalUnit: event.target.value as "week" | "month" | "year" })
                  }
                >
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
                <Input
                  label="Every N intervals"
                  type="number"
                  min="1"
                  value={variant.intervalCount ?? 1}
                  onChange={(event) => patch({ intervalCount: Math.max(1, Number(event.target.value) || 1) })}
                />
                <Input
                  label="Trial days"
                  type="number"
                  min="0"
                  value={variant.trialDays ?? 0}
                  onChange={(event) => patch({ trialDays: Math.max(0, Number(event.target.value) || 0) })}
                />
              </div>
            )}
            {on && section === "license" && (
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={variant.generateLicense ?? false}
                    onChange={(event) => patch({ generateLicense: event.target.checked })}
                  />
                  Issue a license key
                </label>
                <select
                  aria-label="License type"
                  className={field}
                  value={variant.licenseType ?? "standard"}
                  onChange={(event) =>
                    patch({ licenseType: event.target.value as "standard" | "perpetual" })
                  }
                >
                  <option value="standard">Standard</option>
                  <option value="perpetual">Perpetual</option>
                </select>
                <Input
                  label="Device seats (blank = unlimited)"
                  type="number"
                  min="1"
                  value={variant.licenseSeatLimit ?? ""}
                  onChange={(event) =>
                    patch({
                      licenseSeatLimit:
                        event.target.value === "" ? null : Math.max(1, Number(event.target.value) || 1),
                    })
                  }
                />
              </div>
            )}
            {on && section === "delivery" && (
              <div className="space-y-2">
                <textarea
                  aria-label="Delivery message"
                  className={field}
                  rows={3}
                  value={variant.deliveryContent ?? ""}
                  onChange={(event) => patch({ deliveryContent: event.target.value })}
                />
                <Input
                  label="Redirect URL"
                  value={variant.redirectUrl ?? ""}
                  onChange={(event) => patch({ redirectUrl: event.target.value })}
                />
              </div>
            )}
            {on && section === "github" && (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Owner"
                  value={variant.githubRepoOwner ?? ""}
                  onChange={(event) => patch({ githubRepoOwner: event.target.value })}
                />
                <Input
                  label="Repository"
                  value={variant.githubRepoName ?? ""}
                  onChange={(event) => patch({ githubRepoName: event.target.value })}
                />
              </div>
            )}
            {on && section === "files" && (
              <div className="space-y-2">
                {(variant.productFiles ?? []).map((file) => (
                  <div key={file.id} className="flex items-center justify-between">
                    <span>{file.name}</span>
                    <button
                      type="button"
                      className="text-xs text-red-600 underline"
                      onClick={() =>
                        patch({
                          productFiles: (variant.productFiles ?? []).filter((item) => item.id !== file.id),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <input
                  type="file"
                  aria-label="Add file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void upload(file);
                    event.target.value = "";
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
      {message && <Alert variant={message.ok ? "success" : "error"}>{message.text}</Alert>}
      <div className="flex gap-2">
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save overrides"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
    </div>
  );
}
