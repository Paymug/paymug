"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert, Spinner } from "@/components/ui";
import { dashboardPageClass } from "@/components/dashboard/dashboard.styles";
import type { TaxSettingsResponse } from "./page.types";

export function TaxSettings() {
  const [data, setData] = useState<TaxSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/settings/tax");
      const body = (await response.json()) as TaxSettingsResponse;
      if (!response.ok) throw new Error(body.error || "Could not load tax settings");
      setData(body);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load tax settings"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(enabled: boolean) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/tax", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stripeTaxEnabled: enabled }),
      });
      const body = (await response.json()) as { enabled?: boolean; error?: string };
      if (!response.ok) throw new Error(body.error || "Could not save");
      setData((current) =>
        current ? { ...current, enabled: Boolean(body.enabled) } : current
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted">
        <Spinner className="mr-2 h-5 w-5" /> Loading…
      </div>
    );
  }

  const configured = Boolean(data?.stripeConfigured);

  return (
    <div className={`${dashboardPageClass} !max-w-xl pb-12`}>
      <h1 className="sr-only">Tax</h1>
      <section className="py-8 text-center sm:py-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-hover">
          Tax
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#333]">
          Stripe Tax
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-[#74748f]">
          Automatically calculate and collect sales tax, VAT and GST at Stripe
          Checkout.
        </p>
      </section>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {!configured ? (
        <Alert>
          Stripe Tax needs Stripe. Add your Stripe secret key in{" "}
          <Link href="/dashboard/settings/payments" className="underline">
            Payments
          </Link>{" "}
          to enable it.
        </Alert>
      ) : (
        <section className="rounded-2xl border border-[#e8e8ee] bg-white px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-5">
            <div>
              <h3 className="text-base font-semibold text-[#333]">
                Collect tax at checkout
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[#85859d]">
                Prices are treated as tax-exclusive. Tax is added on top and
                the customer&apos;s billing address is collected. Applies to
                Stripe checkouts only.
              </p>
            </div>
            <label className="relative mt-0.5 inline-flex shrink-0 cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={Boolean(data?.enabled)}
                disabled={saving}
                onChange={(event) => void toggle(event.target.checked)}
                aria-label="Enable Stripe Tax"
              />
              <span className="h-6 w-11 rounded-full bg-[#d9d9e1] transition peer-checked:bg-accent peer-focus-visible:ring-3 peer-focus-visible:ring-accent/30 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
            </label>
          </div>

          <dl className="mt-5 space-y-2 border-t border-[#e8e8ee] pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#85859d]">Stripe mode</dt>
              <dd className="font-medium text-[#333]">{data?.mode}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#85859d]">Stripe Tax status</dt>
              <dd className="font-medium text-[#333]">
                {data?.taxStatus === "active"
                  ? "Active"
                  : data?.taxStatus === "pending"
                    ? "Origin address needed"
                    : "Unknown"}
              </dd>
            </div>
            {data?.originCountry && (
              <div className="flex justify-between gap-4">
                <dt className="text-[#85859d]">Origin country</dt>
                <dd className="font-medium text-[#333]">{data.originCountry}</dd>
              </div>
            )}
          </dl>

          {data?.taxStatus !== "active" && (
            <p className="mt-4 text-sm text-[#85859d]">
              {data?.taxError ? `${data.taxError}. ` : ""}
              Set your business origin address and registrations in the{" "}
              <a
                href="https://dashboard.stripe.com/settings/tax"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Stripe Tax dashboard
              </a>
              ; checkouts fail until Stripe Tax is active.
            </p>
          )}
          {data?.paymentGateway && data.paymentGateway !== "stripe" && (
            <p className="mt-4 text-sm text-[#85859d]">
              Stripe is not this store&apos;s payment provider, so tax is not
              applied yet.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
