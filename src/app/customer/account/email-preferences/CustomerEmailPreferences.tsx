"use client";

import { LockSimple } from "@phosphor-icons/react";
import { useState } from "react";
import { Alert, Button, Select } from "@/components/ui";
import type { CustomerStoreEmailPreferences } from "@/lib/customer-email-preferences.types";
import { dedupeCustomerStoreEmailPreferences } from "./customer-email-preferences.utils";
import type {
  CustomerEmailPreferencesProps,
  CustomerEmailPreferencesResponse,
} from "./CustomerEmailPreferences.types";

const optionalEmailTypes = [
  {
    key: "marketingEnabled" as const,
    title: "Marketing and promotions",
    description: "Offers, announcements, and general store campaigns.",
  },
  {
    key: "productUpdatesEnabled" as const,
    title: "Product updates",
    description: "New versions, product news, and update announcements.",
  },
  {
    key: "affiliateUpdatesEnabled" as const,
    title: "Affiliate updates",
    description: "Affiliate program news, opportunities, and announcements.",
  },
];

const mandatoryEmailTypes = [
  "Payment confirmations, receipts, refunds, and failed payments",
  "Purchase delivery, licenses, and access information",
  "Subscription billing and important status changes",
  "Password resets, sign-in links, and account security messages",
];

export function CustomerEmailPreferences({
  initialPreferences,
}: CustomerEmailPreferencesProps) {
  const [preferences, setPreferences] = useState(() =>
    dedupeCustomerStoreEmailPreferences(initialPreferences),
  );
  const [selectedStoreId, setSelectedStoreId] = useState(
    initialPreferences[0]?.storeId || "",
  );
  const [savingStoreId, setSavingStoreId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedPreference =
    preferences.find((preference) => preference.storeId === selectedStoreId) ||
    preferences[0];

  function updatePreference(
    storeId: string,
    key: keyof Pick<
      CustomerStoreEmailPreferences,
      | "marketingEnabled"
      | "productUpdatesEnabled"
      | "affiliateUpdatesEnabled"
    >,
    enabled: boolean,
  ) {
    setPreferences((current) =>
      current.map((preference) =>
        preference.storeId === storeId
          ? { ...preference, [key]: enabled }
          : preference,
      ),
    );
  }

  async function savePreference(preference: CustomerStoreEmailPreferences) {
    setSavingStoreId(preference.storeId);
    setMessage(null);
    setError(null);
    const response = await fetch("/api/customer/email-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: preference.storeId,
        marketingEnabled: preference.marketingEnabled,
        productUpdatesEnabled: preference.productUpdatesEnabled,
        affiliateUpdatesEnabled: preference.affiliateUpdatesEnabled,
      }),
    });
    const data = (await response.json()) as CustomerEmailPreferencesResponse;
    setSavingStoreId(null);
    if (!response.ok) {
      setError(data.error || "Could not update email preferences");
      return;
    }
    setMessage(`${preference.storeName} email preferences updated.`);
  }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <Alert variant={message ? "success" : "error"}>
          {message || error}
        </Alert>
      )}

      <section className="rounded-xl border border-[#e8e8ee] bg-white p-5 sm:p-6">
        <div className="border-b border-[#eeeeF2] pb-5">
          <h2 className="text-lg font-semibold">Email preferences</h2>
          <p className="mt-1 text-sm text-[#85859d]">
            Choose which optional messages you receive from each store.
          </p>
        </div>

        {preferences.length > 1 && (
          <div className="pt-5">
            <Select
              label="Store"
              value={selectedPreference?.storeId || ""}
              options={preferences.map((preference) => ({
                value: preference.storeId,
                label: preference.storeName,
              }))}
              onValueChange={(storeId) => {
                setSelectedStoreId(storeId);
                setMessage(null);
                setError(null);
              }}
            />
          </div>
        )}

        {!selectedPreference ? (
          <p className="py-6 text-sm leading-6 text-[#85859d]">
            No store email subscriptions are connected to this account yet.
          </p>
        ) : (
          <div className="py-6">
            <div className="flex items-center gap-3">
              {selectedPreference.storeLogoImageUrl && (
                <img
                  src={selectedPreference.storeLogoImageUrl}
                  alt=""
                  className="h-10 w-10 rounded-xl object-cover"
                />
              )}
              <h3 className="text-base font-semibold">
                {selectedPreference.storeName}
              </h3>
            </div>

            <div className="mt-3 divide-y divide-[#eeeeF2]">
              {optionalEmailTypes.map((emailType) => (
                <div
                  key={emailType.key}
                  className="flex items-center justify-between gap-5 py-4"
                >
                  <div>
                    <p className="text-sm font-semibold">{emailType.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[#85859d]">
                      {emailType.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={selectedPreference[emailType.key]}
                    onClick={() =>
                      updatePreference(
                        selectedPreference.storeId,
                        emailType.key,
                        !selectedPreference[emailType.key],
                      )
                    }
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                      selectedPreference[emailType.key]
                        ? "bg-accent"
                        : "bg-[#d8d8e0]"
                    }`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                        selectedPreference[emailType.key]
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              ))}

               <div
                  className="flex items-center justify-between gap-5 py-4"
                >
                  <div>
                    <p className="text-sm font-semibold">Mandatory emails</p>
                    <p className="mt-1 text-xs leading-5 text-[#85859d]">
                      {mandatoryEmailTypes.join(", ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    disabled
                    className={`relative h-6 w-11 shrink-0 rounded-full transition bg-accent`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition translate-x-5`}
                    />
                  </button>
                </div>
            </div>
            

            <Button
              type="button"
              className="mt-4"
              disabled={savingStoreId === selectedPreference.storeId}
              onClick={() => void savePreference(selectedPreference)}
            >
              {savingStoreId === selectedPreference.storeId
                ? "Saving…"
                : "Save preferences"}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
