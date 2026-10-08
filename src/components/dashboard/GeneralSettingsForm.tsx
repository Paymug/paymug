"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Button, Input, Select } from "@/components/ui";
import type {
  GeneralSettingsFormProps,
  GeneralSettingsResponse,
} from "./GeneralSettingsForm.types";

export function GeneralSettingsForm({
  name: initialName,
  email,
  memberSince,
  timezone: initialTimezone,
  timezoneOptions,
}: GeneralSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [browserTimezone, setBrowserTimezone] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezoneOptions.some((option) => option.value === detected)) {
      setBrowserTimezone(detected);
    }
  }, [timezoneOptions]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    const response = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, timezone }),
    });
    const data = (await response.json()) as GeneralSettingsResponse;
    setSaving(false);
    if (!response.ok) {
      setError(data.error || "Could not save settings");
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={save}>
      <section className="overflow-hidden rounded-2xl border border-[#e8e8ee] bg-white">
        <div className="border-b border-[#e8e8ee] px-5 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-[#333]">Profile</h2>
          <p className="mt-1 text-sm text-[#85859d]">
            Manage the personal details connected to your account.
          </p>
        </div>
        <div className="space-y-4 px-5 py-5 sm:px-6">
          <Input
            label="Your name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Input label="Email" name="email" value={email} disabled />
          <div>
            <Select
              label="Time zone"
              name="timezone"
              value={timezone}
              onValueChange={setTimezone}
              options={timezoneOptions}
              searchable
              searchPlaceholder="Search time zones…"
            />
            <p className="mt-1.5 text-xs leading-5 text-muted">
              Used for analytics, orders, and other dates in your dashboard.
              {browserTimezone && browserTimezone !== timezone && (
                <>
                  {" "}
                  <button
                    type="button"
                    className="font-medium text-accent-dark hover:underline"
                    onClick={() => setTimezone(browserTimezone)}
                  >
                    Use browser time zone
                  </button>
                </>
              )}
            </p>
          </div>
          <p className="text-sm text-muted">Member since {memberSince}</p>
          {error && <Alert>{error}</Alert>}
          {success && (
            <Alert variant="success">Settings saved.</Alert>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </section>
    </form>
  );
}
