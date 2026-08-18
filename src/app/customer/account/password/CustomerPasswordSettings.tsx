"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Input } from "@/components/ui";
import type {
  CustomerPasswordSettingsProps,
  CustomerPasswordSettingsResponse,
} from "./CustomerPasswordSettings.types";

export function CustomerPasswordSettings({
  hasPassword,
}: CustomerPasswordSettingsProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    if (password !== passwordConfirmation) {
      setSaving(false);
      setError("Passwords do not match");
      return;
    }
    const response = await fetch("/api/customer/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = (await response.json()) as CustomerPasswordSettingsResponse;
    setSaving(false);
    if (!response.ok) {
      setError(data.error || "Could not save password");
      return;
    }
    setPassword("");
    setPasswordConfirmation("");
    setMessage(hasPassword ? "Password updated." : "Password created.");
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-[#e8e8ee] bg-white p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">Password</h2>
        <p className="mt-1 text-sm leading-6 text-[#85859d]">
          {hasPassword
            ? "Update the password used to sign in to your customer portal."
            : "Create a password for faster access without an email link."}
        </p>
      </div>

      <form onSubmit={savePassword} className="mt-6 space-y-3">
        <Input
          label={hasPassword ? "New password" : "Create a password"}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
        <Input
          label="Confirm password"
          type="password"
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          minLength={8}
          required
        />
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={saving}>
            {saving
              ? "Saving…"
              : hasPassword
                ? "Update password"
                : "Create password"}
          </Button>
        </div>
      </form>
      {message && (
        <div className="mt-5">
          <Alert variant="success">{message}</Alert>
        </div>
      )}
      {error && (
        <div className="mt-5">
          <Alert>{error}</Alert>
        </div>
      )}
    </section>
  );
}
