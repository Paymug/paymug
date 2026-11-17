"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button } from "@/components/ui";
import type { PendingMigrationNoticeProps } from "./PendingMigrationNotice.types";

export function PendingMigrationNotice({
  pending,
  signedIn,
}: PendingMigrationNoticeProps) {
  const router = useRouter();
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    setApplying(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard/migrations", {
        method: "POST",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Migration failed");
      router.refresh();
    } catch (applyError) {
      setError(
        applyError instanceof Error ? applyError.message : "Migration failed",
      );
      setApplying(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-white px-4">
      <section className="w-full max-w-md rounded-2xl border border-[#e8e8ee] p-7 text-center shadow-[0_24px_70px_rgba(24,22,32,0.12)]">
        <h1 className="text-lg font-semibold">Database update required</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          A new version was deployed that needs{" "}
          {pending.length === 1
            ? "1 database migration"
            : `${pending.length} database migrations`}
          . Apply {pending.length === 1 ? "it" : "them"} to continue. Your data
          is kept.
        </p>
        <ul className="mt-4 space-y-1 text-left text-xs text-muted">
          {pending.map((name) => (
            <li key={name}>
              <code>{name}</code>
            </li>
          ))}
        </ul>
        {error && (
          <div className="mt-4 text-left">
            <Alert>{error}</Alert>
          </div>
        )}
        <div className="mt-5">
          {signedIn ? (
            <Button onClick={apply} disabled={applying}>
              {applying ? "Applying…" : "Apply migrations"}
            </Button>
          ) : (
            <Link href="/login" className="text-sm font-medium underline">
              Sign in to apply the update
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
