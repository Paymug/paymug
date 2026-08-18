"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Select, Spinner } from "@/components/ui";
import { dashboardPageClass } from "@/components/dashboard/dashboard.styles";
import type { PaymentProviderResponse } from "./page.types";
import { PayPalConnectionCard } from "./PayPalConnectionCard";
import { StripeConnectionCard } from "./StripeConnectionCard";
import { PaymentSetupSection } from "./PaymentSetupSection";
import {
  fetchPaymentProvider,
  savePaymentProvider,
} from "./payment-provider.utils";

export default function PaymentsPage() {
  const router = useRouter();
  const [provider, setProvider] = useState<
    PaymentProviderResponse["provider"]
  >("paypal");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    Record<string, boolean>
  >({});

  const setProviderStatus = useCallback(
    (mode: string, connected: boolean) => {
      setConnectionStatus((current) => ({ ...current, [mode]: connected }));
    },
    []
  );
  const onPayPalSandboxStatusChange = useCallback(
    (connected: boolean) => setProviderStatus("paypal-sandbox", connected),
    [setProviderStatus]
  );
  const onPayPalLiveStatusChange = useCallback(
    (connected: boolean) => setProviderStatus("paypal-live", connected),
    [setProviderStatus]
  );
  const onStripeSandboxStatusChange = useCallback(
    (connected: boolean) => setProviderStatus("stripe-sandbox", connected),
    [setProviderStatus]
  );
  const onStripeLiveStatusChange = useCallback(
    (connected: boolean) => setProviderStatus("stripe-live", connected),
    [setProviderStatus]
  );

  useEffect(() => {
    let active = true;
    void fetchPaymentProvider()
      .then((data) => {
        if (active) setProvider(data.provider);
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load payment provider"
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function selectProvider(
    selectedProvider: PaymentProviderResponse["provider"]
  ) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await savePaymentProvider(selectedProvider);
      setProvider(data.provider);
      setSuccess(
        `${data.provider === "paypal" ? "PayPal" : "Stripe"} is now the store's payment provider.`
      );
      router.refresh();
    } catch (providerError) {
      setError(
        providerError instanceof Error
          ? providerError.message
          : "Could not save payment provider"
      );
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

  const providerLabel = provider === "paypal" ? "PayPal" : "Stripe";
  const sandboxStatusKey = `${provider}-sandbox`;
  const liveStatusKey = `${provider}-live`;
  const completedSteps =
    1 +
    Number(Boolean(connectionStatus[sandboxStatusKey])) +
    Number(Boolean(connectionStatus[liveStatusKey]));
  const progress = Math.round((completedSteps / 3) * 100);

  return (
    <div className={`${dashboardPageClass} !max-w-xl pb-12`}>
      <h1 className="sr-only">Payments</h1>
      <section className="py-8 text-center sm:py-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-hover">
          Payment setup
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#333]">
          Payment provider
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-[#74748f]">
          Credentials come from environment variables and are never stored in
          the database. Choose which provider customers see at checkout.
        </p>

        <div className="mx-auto mt-7 max-w-xl">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-[#333]">
              {completedSteps} of 3 steps complete
            </span>
            <span className="font-semibold text-accent-hover">{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eeeeF3]">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </section>

      <section
        key={provider}
        className="overflow-hidden rounded-2xl border border-[#e8e8ee] bg-white"
      >
        <div className="border-b border-[#e8e8ee] px-5 py-4 sm:px-6">
          <h3 className="text-lg font-semibold text-[#333]">
            {providerLabel} setup
          </h3>
          <p className="mt-1 text-sm text-[#85859d]">
            Choose your provider, then review the environment credentials for
            sandbox and live.
          </p>
        </div>

        <PaymentSetupSection
          stepNumber={1}
          title="Choose a payment provider"
          description="Select which gateway customers will use at checkout."
          complete={Boolean(provider)}
        >
          <Select
            label="Payment provider"
            name="paymentProvider"
            value={provider}
            onValueChange={(value) =>
              void selectProvider(value as PaymentProviderResponse["provider"])
            }
            disabled={saving}
            options={[
              { value: "paypal", label: "PayPal" },
              { value: "stripe", label: "Stripe" },
            ]}
          />
          <p className="mt-2 text-sm text-muted">
            Customers will only see the selected provider at checkout.
          </p>
          {error && (
            <div className="mt-4">
              <Alert>{error}</Alert>
            </div>
          )}
          {success && (
            <div className="mt-4">
              <Alert variant="success">{success}</Alert>
            </div>
          )}
        </PaymentSetupSection>

        <PaymentSetupSection
          stepNumber={2}
          title={`${providerLabel} sandbox`}
          description="Test checkout and webhook delivery safely."
          complete={Boolean(connectionStatus[sandboxStatusKey])}
          defaultOpen={!connectionStatus[sandboxStatusKey]}
        >
          {provider === "paypal" ? (
            <PayPalConnectionCard
              mode="sandbox"
              onStatusChange={onPayPalSandboxStatusChange}
            />
          ) : (
            <StripeConnectionCard
              mode="sandbox"
              onStatusChange={onStripeSandboxStatusChange}
            />
          )}
        </PaymentSetupSection>

        <PaymentSetupSection
          stepNumber={3}
          title={`${providerLabel} live`}
          description="Accept production payments from customers."
          complete={Boolean(connectionStatus[liveStatusKey])}
        >
          {provider === "paypal" ? (
            <PayPalConnectionCard
              mode="live"
              onStatusChange={onPayPalLiveStatusChange}
            />
          ) : (
            <StripeConnectionCard
              mode="live"
              onStatusChange={onStripeLiveStatusChange}
            />
          )}
        </PaymentSetupSection>
      </section>
    </div>
  );
}
