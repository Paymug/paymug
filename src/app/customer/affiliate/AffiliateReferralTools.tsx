"use client";

import { Check } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Input } from "@/components/ui";
import type {
  AffiliateReferralToolsProps,
  AffiliateUsernameResponse,
} from "./AffiliateReferralTools.types";

export function AffiliateReferralTools({
  program,
}: AffiliateReferralToolsProps) {
  const router = useRouter();
  const [username, setUsername] = useState(program.affiliate?.code || "");
  const [activeUsername, setActiveUsername] = useState(
    program.affiliate?.code || "",
  );
  const [usernameLocked, setUsernameLocked] = useState(
    program.affiliate?.usernameLocked || false,
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!program.affiliate) return null;

  async function saveUsername(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch(
        `/api/customer/affiliates/${program.affiliate?.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        },
      );
      const data = (await response.json()) as AffiliateUsernameResponse;
      if (!response.ok) throw new Error(data.error || "Could not save username");
      setActiveUsername(username);
      setUsernameLocked(true);
      setSaved(true);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save username",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#e8e8ee] bg-white p-5 sm:p-6">
      <div className="max-w-xl">
        <p className="text-sm font-semibold">Referral username</p>
        <p className="mt-1 text-sm leading-6 text-[#85859d]">
          Your permanent referral ID is used in every product link and embed.
        </p>
        {usernameLocked ? (
          <div className="mt-4 rounded-xl border border-[#e8e8ee] bg-[#fafafd] p-4">
            <p className="text-xs font-medium text-[#85859d]">
              Permanent referral username
            </p>
            <p className="mt-1 font-semibold">{activeUsername}</p>
            <p className="mt-2 text-xs leading-5 text-[#9292a3]">
              Referral usernames can only be selected once and cannot be
              changed later.
            </p>
          </div>
        ) : (
          <form onSubmit={saveUsername} className="mt-4 space-y-3">
            <Input
              label="Username"
              value={username}
              onChange={(event) => {
                setUsername(
                  event.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, ""),
                );
                setSaved(false);
              }}
              minLength={3}
              maxLength={48}
              required
            />
            <p className="text-xs leading-5 text-[#9292a3]">
              Choose carefully. Your username must be unique and can only be
              saved once.
            </p>
            {error && <Alert>{error}</Alert>}
            {saved && (
              <p className="flex items-center gap-1.5 text-sm text-emerald-700">
                <Check size={15} /> Referral username saved.
              </p>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Set permanent username"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
